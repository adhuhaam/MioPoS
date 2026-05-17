import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(moduleDir, "../imports/database_export.sql");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

if (!fs.existsSync(sqlPath)) {
  throw new Error(`SQL file not found: ${sqlPath}`);
}

function hasPsql(): boolean {
  try {
    execSync("command -v psql", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function importWithPg(): Promise<void> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const sql = fs.readFileSync(sqlPath, "utf8");
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  console.warn(
    "This replaces the entire database (DROP + CREATE + data). Run once on a fresh Railway Postgres instance.",
  );
  console.log(`Importing ${sqlPath} ...`);

  if (hasPsql()) {
    execSync(`psql "${process.env.DATABASE_URL}" -v ON_ERROR_STOP=1 --single-transaction -f "${sqlPath}"`, {
      stdio: "inherit",
      env: process.env,
    });
  } else {
    console.log("psql not found; using node pg client");
    await importWithPg();
  }

  console.log("Import complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
