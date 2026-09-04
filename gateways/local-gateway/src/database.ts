import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { config } from "./config";

type RawClient = PrismaClient | Prisma.TransactionClient;
type QueryResult<T = Record<string, unknown>> = { rows: T[]; rowCount: number };

export class PrismaQueryAdapter {
  constructor(private readonly client: RawClient) {}

  async query<T = Record<string, unknown>>(sql: string, parameters: unknown[] = []): Promise<QueryResult<T>> {
    const values = parameters.map((value) =>
      value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !Buffer.isBuffer(value)
        ? JSON.stringify(value)
        : value,
    );
    const returnsRows = /^\s*(SELECT|WITH)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
    if (returnsRows) {
      const rows = await this.client.$queryRawUnsafe<T[]>(sql, ...values);
      return { rows, rowCount: rows.length };
    }
    const rowCount = await this.client.$executeRawUnsafe(sql, ...values);
    return { rows: [], rowCount };
  }
}

const adapter = new PrismaPg({ connectionString: config.databaseUrl });
export const prisma = new PrismaClient({ adapter });
export const pool = {
  query: <T = Record<string, unknown>>(sql: string, parameters?: unknown[]) =>
    new PrismaQueryAdapter(prisma).query<T>(sql, parameters),
  end: () => prisma.$disconnect(),
};

export async function verifyDatabase() {
  const tables = await prisma.$queryRaw<Array<{ name: string | null }>>`
    SELECT to_regclass('public.gateway_meta')::text AS name
  `;
  if (!tables[0]?.name) throw new Error("LOCAL_DATABASE_NOT_MIGRATED");
  await prisma.gatewayMeta.upsert({
    where: { key: "store_id" },
    create: { key: "store_id", value: config.storeId },
    update: { value: config.storeId },
  });
}

export async function transaction<T>(work: (client: PrismaQueryAdapter) => Promise<T>) {
  return prisma.$transaction(
    (client) => work(new PrismaQueryAdapter(client)),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
