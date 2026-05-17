/**
 * Verifies menu item insert needs real outlet_id (not 0).
 * Run: DATABASE_URL="$(railway run printenv DATABASE_PUBLIC_URL)" node scripts/test-menu-item-create.mjs
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../lib/db/package.json"));
const pg = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const catRes = await pool.query(
  `SELECT id, outlet_id, name FROM menu_categories ORDER BY id LIMIT 1`,
);
if (catRes.rows.length === 0) {
  console.error("No categories in database");
  process.exit(1);
}
const { id: categoryId, outlet_id: expectedOutletId, name: categoryName } = catRes.rows[0];
console.log(`Category #${categoryId} "${categoryName}" → outlet_id=${expectedOutletId}`);

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const insert = await client.query(
    `INSERT INTO menu_items (category_id, outlet_id, name, description, price, available)
     VALUES ($1, $2, $3, NULL, '0.01', true) RETURNING outlet_id`,
    [categoryId, expectedOutletId, `__test_${Date.now()}`],
  );
  await client.query("ROLLBACK");
  const resolved = insert.rows[0].outlet_id;
  if (Number(resolved) !== Number(expectedOutletId) || Number(resolved) <= 0) {
    console.error(`FAIL: outlet_id=${resolved}, expected ${expectedOutletId}`);
    process.exit(1);
  }
  console.log(`OK: resolved outlet_id=${resolved} (rolled back)`);

  await client.query("BEGIN");
  let fkFailed = false;
  try {
    await client.query(
      `INSERT INTO menu_items (category_id, outlet_id, name, price, available)
       VALUES ($1, 0, '__should_fail', '0.01', true)`,
      [categoryId],
    );
  } catch (e) {
    fkFailed = e.code === "23503";
  }
  await client.query("ROLLBACK");
  if (!fkFailed) {
    console.error("FAIL: outlet_id=0 should hit FK constraint");
    process.exit(1);
  }
  console.log("OK: outlet_id=0 rejected by FK (expected)");
} finally {
  client.release();
  await pool.end();
}

console.log("\nAll DB checks passed.");
