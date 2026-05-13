import { Router } from "express";
import { eq, and, desc, inArray, SQL } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  tablesTable,
  menuItemsTable,
  outletsTable,
  paymentsTable,
  type OrderStatus,
} from "@workspace/db";
import { requireAuth, requireRole } from "../lib/session";

const router = Router();

function recalcOrder(
  items: Array<{ unitPrice: string; quantity: number }>,
  taxRate: number,
  discountPercent?: string | null
) {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.unitPrice) * i.quantity, 0);
  const dp = discountPercent ? parseFloat(discountPercent) : 0;
  const discountAmount = subtotal * (dp / 100);
  const taxable = subtotal - discountAmount;
  const taxAmount = taxable * (taxRate / 100);
  const total = taxable + taxAmount;
  return { subtotal, discountAmount, taxAmount, total };
}

router.get("/orders", requireAuth, async (req, res) => {
  try {
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const status = req.query.status as string | undefined;
    const tableId = req.query.tableId ? parseInt(req.query.tableId as string) : undefined;

    const conditions: SQL[] = [];
    if (outletId) conditions.push(eq(ordersTable.outletId, outletId));
    if (status) conditions.push(eq(ordersTable.status, status as OrderStatus));
    if (tableId) conditions.push(eq(ordersTable.tableId, tableId));

    const ordersRaw = conditions.length
      ? await db.select().from(ordersTable).where(and(...conditions)).orderBy(desc(ordersTable.createdAt))
      : await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));

    const ordersWithItems = await Promise.all(ordersRaw.map(async (order) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      const table = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, order.tableId) });
      return { ...order, items, tableName: table?.name ?? "" };
    }));

    return res.json({ orders: ordersWithItems, total: ordersWithItems.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders", requireRole("super_admin", "manager", "cashier"), async (req, res) => {
  try {
    const { outletId, tableId, staffId, notes } = req.body;
    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, outletId) });
    if (!outlet) return res.status(404).json({ error: "Outlet not found" });

    const [order] = await db.insert(ordersTable).values({
      outletId,
      tableId,
      staffId: staffId ?? null,
      notes: notes ?? null,
      status: "open",
    }).returning();

    await db.update(tablesTable).set({ status: "occupied" }).where(eq(tablesTable.id, tableId));

    return res.status(201).json({ ...order, items: [], tableName: "" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, id) });
    if (!order) return res.status(404).json({ error: "Not found" });
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    const table = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, order.tableId) });
    return res.json({ ...order, items, tableName: table?.name ?? "" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/orders/:id", requireRole("super_admin", "manager", "cashier"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes, discountPercent } = req.body;

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, id) });
    if (!order) return res.status(404).json({ error: "Not found" });

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    if (discountPercent !== undefined) {
      updates.discountPercent = discountPercent !== null ? discountPercent.toString() : null;
      const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
      const taxRate = parseFloat(outlet?.taxRate ?? "0");
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
      const calc = recalcOrder(items, taxRate, discountPercent?.toString());
      updates.subtotal = calc.subtotal.toFixed(2);
      updates.discountAmount = calc.discountAmount.toFixed(2);
      updates.taxAmount = calc.taxAmount.toFixed(2);
      updates.total = calc.total.toFixed(2);
    }

    const newStatus = status as OrderStatus | undefined;
    if (newStatus === "paid" || newStatus === "cancelled") {
      await db.update(tablesTable).set({ status: "available" }).where(eq(tablesTable.id, order.tableId));
    } else if (newStatus === "billed") {
      await db.update(tablesTable).set({ status: "bill_requested" }).where(eq(tablesTable.id, order.tableId));
    }

    const [updated] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    const table = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, updated.tableId) });
    return res.json({ ...updated, items, tableName: table?.name ?? "" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/:id/items", requireRole("super_admin", "manager", "cashier"), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { menuItemId, quantity, notes } = req.body;

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const menuItem = await db.query.menuItemsTable.findFirst({ where: eq(menuItemsTable.id, menuItemId) });
    if (!menuItem) return res.status(404).json({ error: "Menu item not found" });

    const qty = quantity ?? 1;
    const unitPrice = parseFloat(menuItem.price);
    const total = unitPrice * qty;

    const [item] = await db.insert(orderItemsTable).values({
      orderId,
      menuItemId,
      menuItemName: menuItem.name,
      quantity: qty,
      unitPrice: unitPrice.toFixed(2),
      total: total.toFixed(2),
      notes: notes ?? null,
      kitchenStatus: "pending",
    }).returning();

    const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
    const taxRate = parseFloat(outlet?.taxRate ?? "0");
    const calc = recalcOrder(allItems, taxRate, order.discountPercent);

    await db.update(ordersTable).set({
      subtotal: calc.subtotal.toFixed(2),
      discountAmount: calc.discountAmount.toFixed(2),
      taxAmount: calc.taxAmount.toFixed(2),
      total: calc.total.toFixed(2),
    }).where(eq(ordersTable.id, orderId));

    return res.status(201).json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/orders/:id/items/:itemId", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const { quantity, notes, kitchenStatus } = req.body;

    const orderItem = await db.query.orderItemsTable.findFirst({ where: eq(orderItemsTable.id, itemId) });
    if (!orderItem) return res.status(404).json({ error: "Item not found" });

    const updates: Record<string, unknown> = {};
    if (quantity !== undefined) {
      updates.quantity = quantity;
      updates.total = (parseFloat(orderItem.unitPrice) * quantity).toFixed(2);
    }
    if (notes !== undefined) updates.notes = notes;
    if (kitchenStatus !== undefined) updates.kitchenStatus = kitchenStatus;

    const [updated] = await db.update(orderItemsTable).set(updates).where(eq(orderItemsTable.id, itemId)).returning();

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (order) {
      const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
      const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
      const taxRate = parseFloat(outlet?.taxRate ?? "0");
      const calc = recalcOrder(allItems, taxRate, order.discountPercent);
      await db.update(ordersTable).set({
        subtotal: calc.subtotal.toFixed(2),
        discountAmount: calc.discountAmount.toFixed(2),
        taxAmount: calc.taxAmount.toFixed(2),
        total: calc.total.toFixed(2),
      }).where(eq(ordersTable.id, orderId));
    }

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/orders/:id/items/:itemId", requireRole("super_admin", "manager", "cashier"), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);

    await db.delete(orderItemsTable).where(eq(orderItemsTable.id, itemId));

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (order) {
      const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
      const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
      const taxRate = parseFloat(outlet?.taxRate ?? "0");
      const calc = recalcOrder(allItems, taxRate, order.discountPercent);
      await db.update(ordersTable).set({
        subtotal: calc.subtotal.toFixed(2),
        discountAmount: calc.discountAmount.toFixed(2),
        taxAmount: calc.taxAmount.toFixed(2),
        total: calc.total.toFixed(2),
      }).where(eq(ordersTable.id, orderId));
    }

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/:id/payments", requireRole("super_admin", "manager", "cashier"), async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { method, amount } = req.body;

    const [payment] = await db.insert(paymentsTable).values({
      orderId,
      method,
      amount: amount.toString(),
    }).returning();

    await db.update(ordersTable).set({ status: "paid" }).where(eq(ordersTable.id, orderId));
    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (order) {
      await db.update(tablesTable).set({ status: "available" }).where(eq(tablesTable.id, order.tableId));
    }

    return res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
