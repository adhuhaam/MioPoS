/** Staff roles aligned with DB enum (see lib/db/schema/staff.ts). */
export type StaffRole = "super_admin" | "manager" | "cashier" | "kitchen" | "waiter";

export function normalizeRole(role: string): string {
  return role.trim().toLowerCase().replace(/\s+/g, "_");
}

export function canManageTables(role: string): boolean {
  const r = normalizeRole(role);
  return r === "super_admin" || r === "manager";
}

/** Floor staff: view/update orders, POS, receipts — not table layout admin. */
export function canOperateOrders(role: string): boolean {
  const r = normalizeRole(role);
  return r === "super_admin" || r === "manager" || r === "cashier" || r === "waiter";
}

/** POS dine-in tab and table picker (read-only table list for cashier/waiter). */
export function canUsePosDineIn(role: string): boolean {
  return canOperateOrders(role);
}
