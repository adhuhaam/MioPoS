import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, tablesTable } from "@workspace/db";

const router = Router();

router.get("/kitchen", async (req, res) => {
  try {
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;

    const openOrders = outletId
      ? await db.select().from(ordersTable).where(
          and(
            eq(ordersTable.outletId, outletId),
            inArray(ordersTable.status, ["open", "billed"])
          )
        )
      : await db.select().from(ordersTable).where(
          inArray(ordersTable.status, ["open", "billed"])
        );

    const kitchenOrders = await Promise.all(openOrders.map(async (order) => {
      const items = await db.select().from(orderItemsTable)
        .where(
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
