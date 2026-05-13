import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, tablesTable, type OrderStatus } from "@workspace/db";
import { requireRole, resolveOutletId } from "../lib/session";

const router = Router();

async function fetchKitchenOrders(outletId: number | undefined) {
  const activeStatuses: OrderStatus[] = ["open", "billed"];

  const openOrders = outletId
    ? await db.select().from(ordersTable).where(
        and(eq(ordersTable.outletId, outletId), inArray(ordersTable.status, activeStatuses))
      )
    : await db.select().from(ordersTable).where(inArray(ordersTable.status, activeStatuses));

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

  return kitchenOrders.filter(o => o.items.length > 0);
}

router.get("/kitchen/orders", requireRole("super_admin", "manager", "kitchen", "cashier"), async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    const orders = await fetchKitchenOrders(outletId);
    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/kitchen/orders/stream", requireRole("super_admin", "manager", "kitchen", "cashier"), async (req: Request, res: Response) => {
  const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
  const outletId = resolveOutletId(req, requestedOutletId);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = async () => {
    try {
      const orders = await fetchKitchenOrders(outletId);
      res.write(`data: ${JSON.stringify(orders)}\n\n`);
    } catch {
      // ignore transient errors in stream
    }
  };

  await send();
  const interval = setInterval(send, 5000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

export default router;
