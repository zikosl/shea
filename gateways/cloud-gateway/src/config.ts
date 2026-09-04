import "dotenv/config";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export const config = {
  host: process.env.HOST?.trim() || "0.0.0.0",
  port: Number(process.env.PORT || 3520),
  databaseUrl: required("DATABASE_URL"),
  serviceToken: required("SAAS_SERVICE_TOKEN"),
};
