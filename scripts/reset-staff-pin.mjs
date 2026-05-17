#!/usr/bin/env node
/**
 * Reset a staff member's 4-digit PIN (bcrypt).
 *
 * Usage:
 *   node scripts/reset-staff-pin.mjs --name SUDO --pin 0000
 *   DATABASE_URL=... node scripts/reset-staff-pin.mjs --id 23 --pin 1234
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(new URL("../lib/db/package.json", import.meta.url));
const bcrypt = require("bcryptjs");
const pg = require("pg");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvLocal();

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const pin = arg("pin");
const name = arg("name");
const id = arg("id");
const role = arg("role");

if (!pin || !/^\d{4}$/.test(pin)) {
  console.error("Usage: node scripts/reset-staff-pin.mjs --pin 0000 (--name SUDO | --id 23 | --role super_admin)");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set (.env.local or env)");
  process.exit(1);
}

const hash = await bcrypt.hash(pin, 10);
const client = new pg.Client({ connectionString: url });
await client.connect();

let rows;
if (id) {
  const r = await client.query(
    `UPDATE staff SET pin = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, role`,
    [hash, parseInt(id, 10)],
  );
  rows = r.rows;
} else if (name) {
  const r = await client.query(
    `UPDATE staff SET pin = $1, updated_at = NOW() WHERE UPPER(name) = UPPER($2) RETURNING id, name, role`,
    [hash, name],
  );
  rows = r.rows;
} else if (role) {
  const r = await client.query(
    `UPDATE staff SET pin = $1, updated_at = NOW() WHERE role = $2 RETURNING id, name, role`,
    [hash, role],
  );
  rows = r.rows;
} else {
  console.error("Specify --name, --id, or --role");
  process.exit(1);
}

await client.end();

if (!rows.length) {
  console.error("No staff row updated");
  process.exit(1);
}

for (const row of rows) {
  console.log(`Updated ${row.name} (${row.role}, id=${row.id}) → PIN ${pin}`);
}
