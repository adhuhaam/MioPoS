import { eq } from "drizzle-orm";
import { db, tablesTable, serviceTypeEnum, type ServiceType } from "@workspace/db";

export function resolveServiceType(body: {
  serviceType?: string | null;
  tableId?: number | null;
  deliveryAddress?: string | null;
}): ServiceType {
  const raw = typeof body.serviceType === "string" ? body.serviceType.trim().toLowerCase() : "";
  if ((serviceTypeEnum as readonly string[]).includes(raw)) return raw as ServiceType;
  if (body.tableId != null && Number(body.tableId) > 0) return "dine_in";
  if (body.deliveryAddress?.trim()) return "delivery";
  return "takeaway";
}

type OrderRow = {
  serviceType?: string | null;
  tableId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
};

export function orderDisplayLabel(order: OrderRow, physicalTableName?: string | null): string {
  const st = (order.serviceType ?? "dine_in") as ServiceType;
  if (st === "dine_in") {
    return physicalTableName?.trim() || (order.tableId ? `Table #${order.tableId}` : "Dine in");
  }
  if (st === "takeaway") {
    const who = order.customerName?.trim() || order.customerPhone?.trim();
    return who ? `Takeaway · ${who}` : "Takeaway";
  }
  const who = order.customerName?.trim() || order.customerPhone?.trim();
  return who ? `Delivery · ${who}` : "Delivery";
}

export async function resolveTableName(tableId: number | null | undefined): Promise<string> {
  if (!tableId) return "";
  const table = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, tableId) });
  return table?.name ?? "";
}

export async function presentOrder<T extends OrderRow>(order: T) {
  const physicalTableName = await resolveTableName(order.tableId);
  return {
    ...order,
    serviceType: (order.serviceType ?? "dine_in") as ServiceType,
    tableName: orderDisplayLabel(order, physicalTableName),
  };
}

export async function setTableStatus(
  tableId: number | null | undefined,
  status: "available" | "occupied" | "bill_requested",
) {
  if (tableId == null) return;
  await db.update(tablesTable).set({ status }).where(eq(tablesTable.id, tableId));
}
