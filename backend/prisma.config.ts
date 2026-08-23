import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        seed: 'node -r ts-node/register prisma/seed.ts',
        path: 'prisma/migrations',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
})
