/**
 * End-to-end API test: super-admin login + create menu item (outletId 0 in body).
 * Requires local API on http://127.0.0.1:8787
 *
 * Usage:
 *   PIN=your_super_admin_pin node scripts/test-menu-api-local.mjs
 */
const BASE = process.env.API_BASE ?? "http://127.0.0.1:8787";
const PIN = process.env.PIN;

if (!PIN) {
  console.error("Set PIN=your_super_admin_4_digit_pin");
  process.exit(1);
}

const jar = { cookie: "" };

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(jar.cookie ? { Cookie: jar.cookie } : {}),
      ...options.headers,
    },
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    jar.cookie = [jar.cookie, c.split(";")[0]].filter(Boolean).join("; ");
  }
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

const login = await api("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ pin: PIN }),
});
if (!login.res.ok) {
  console.error("Login failed", login.res.status, login.body);
  process.exit(1);
}
console.log("OK: logged in as", login.body.staff?.name, "| outlet id:", login.body.outlet?.id);

const cats = await api("/api/menu/categories?outletId=0");
if (!cats.res.ok || !cats.body?.length) {
  console.error("Categories failed", cats.res.status, cats.body);
  process.exit(1);
}
const category = cats.body[0];
console.log(`Using category #${category.id} "${category.name}" outletId=${category.outletId}`);

const create = await api("/api/menu/items", {
  method: "POST",
  body: JSON.stringify({
    categoryId: category.id,
    outletId: 0,
    name: `__local_test_${Date.now()}`,
    price: 6,
    available: true,
  }),
});
if (!create.res.ok) {
  console.error("Create menu item FAILED", create.res.status, create.body);
  process.exit(1);
}
console.log("OK: created menu item id", create.body.id, "outletId", create.body.outletId);

await api(`/api/menu/items/${create.body.id}`, { method: "DELETE" });
console.log("OK: cleaned up test item");
console.log("\nAPI test passed.");
