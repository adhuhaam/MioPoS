import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(moduleDir, "../imports/database_export.sql");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

if (!fs.existsSync(sqlPath)) {
  throw new Error(`SQL file not found: ${sqlPath}`);
}

console.warn(
  "This replaces the entire database (DROP + CREATE + data). Run once on a fresh Railway Postgres instance.",
);
console.log(`Importing ${sqlPath} ...`);

execSync(`psql "${process.env.DATABASE_URL}" -v ON_ERROR_STOP=1 --single-transaction -f "${sqlPath}"`, {
  stdio: "inherit",
  env: process.env,
});

console.log("Import complete.");
