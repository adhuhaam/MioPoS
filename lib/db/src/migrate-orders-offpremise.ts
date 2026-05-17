/**
 * Idempotent migration for takeaway/delivery order columns.
 * Run: pnpm --filter @workspace/db exec tsx src/migrate-orders-offpremise.ts
 */
import pg from "pg";

const statements = [
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'dine_in'`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name text`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone text`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address text`,
  `ALTER TABLE orders ALTER COLUMN table_id DROP NOT NULL`,
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  for (const sql of statements) {
    console.log("→", sql);
    await c.query(sql);
  }
  console.log("Done.");
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
