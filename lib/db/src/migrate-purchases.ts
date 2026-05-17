/**
 * Purchase invoices (Input Tax) + outlet business TIN.
 * Run: pnpm --filter @workspace/db run migrate:purchases
 */
import pg from "pg";

const statements = [
  `ALTER TABLE outlets ADD COLUMN IF NOT EXISTS business_tin text`,
  `CREATE TABLE IF NOT EXISTS purchase_invoices (
    id serial PRIMARY KEY,
    outlet_id integer NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    supplier_name text NOT NULL,
    supplier_tin text NOT NULL,
    invoice_number text NOT NULL,
    invoice_date timestamptz NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    gst_amount numeric(12,2) NOT NULL,
    description text,
    notes text,
    staff_id integer REFERENCES staff(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS purchase_invoices_outlet_date_idx
    ON purchase_invoices (outlet_id, invoice_date)`,
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  for (const sql of statements) {
    console.log("→", sql.split("\n")[0].slice(0, 80) + "…");
    await c.query(sql);
  }
  console.log("Done.");
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
