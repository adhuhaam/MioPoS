/**
 * Bank transfer fields on outlets + pay_token on orders.
 * Run: pnpm --filter @workspace/db run migrate:bank-pay
 */
import pg from "pg";

const statements = [
  `ALTER TABLE outlets ADD COLUMN IF NOT EXISTS bank_name text`,
  `ALTER TABLE outlets ADD COLUMN IF NOT EXISTS bank_account_name text`,
  `ALTER TABLE outlets ADD COLUMN IF NOT EXISTS bank_account_number text`,
  `ALTER TABLE outlets ADD COLUMN IF NOT EXISTS bank_branch text`,
  `ALTER TABLE outlets ADD COLUMN IF NOT EXISTS bank_transfer_note text`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_token text`,
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
