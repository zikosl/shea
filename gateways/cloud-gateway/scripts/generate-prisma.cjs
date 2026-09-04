const { spawnSync } = require("node:child_process");
const path = require("node:path");

process.env.DATABASE_URL ||= "postgresql://build:build@127.0.0.1:5432/build";
const result = spawnSync(process.execPath, [path.join("node_modules", "prisma", "build", "index.js"), "generate"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
