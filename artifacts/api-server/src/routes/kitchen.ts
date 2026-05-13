import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, tablesTable, type OrderStatus } from "@workspace/db";
import { requireRole } from "../lib/session";

const router = Router();

router.get("/kitchen/orders", requireRole("super_admin", "manager", "kitchen"), async (req, res) => {
  try {
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;

    const activeStatuses: OrderStatus[] = ["open", "billed"];

    const openOrders = outletId
      ? await db.select().from(ordersTable).where(
          and(
            eq(ordersTable.outletId, outletId),
            inArray(ordersTable.status, activeStatuses)
          )
        )
      : await db.select().from(ordersTable).where(
          inArray(ordersTable.status, activeStatuses)
        );

    const kitchenOrders = await Promise.all(openOrders.map(async (order) => {
      const items = await db.select().from(orderItemsTable).where(
        and(
          eq(orderItemsTable.orderId, order.id),
          inArray(orderItemsTable.kitchenStatus, ["pending", "preparing", "ready"])
        )
      );
      const table = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, order.tableId) });
      return {
        id: order.id,
        tableId: order.tableId,
        tableName: table?.name ?? "",
        status: order.status,
        createdAt: order.createdAt,
        items,
      };
    }));

    const filtered = kitchenOrders.filter(o => o.items.length > 0);
    return res.json(filtered);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
