import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, desc, sum, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  orderItemModifiersTable,
  tablesTable,
  areasTable,
  menuItemsTable,
  modifierGroupsTable,
  outletsTable,
  paymentsTable,
  customersTable,
  type OrderStatus,
} from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";

const router = Router();

function recalcOrder(
  items: Array<{ unitPrice: string; quantity: number; total: string }>,
  taxRate: number,
  discountPercent?: string | null,
  timeFee: number = 0
): { subtotal: number; discountAmount: number; taxAmount: number; total: number } {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.total), 0);
  const dp = discountPercent ? parseFloat(discountPercent) : 0;
  const discountAmount = subtotal * (dp / 100);
  const taxable = subtotal - discountAmount;
  const taxAmount = taxable * (taxRate / 100);
  const total = taxable + taxAmount + timeFee;
  return { subtotal, discountAmount, taxAmount, total };
}

function assertOutletAccess(req: Request, resourceOutletId: number): boolean {
  if (req.session.role === "super_admin") return true;
  return req.session.outletId === resourceOutletId;
}

async function itemsWithModifiers(orderId: number) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  return Promise.all(items.map(async (item) => {
    const modifiers = await db.select().from(orderItemModifiersTable).where(eq(orderItemModifiersTable.orderItemId, item.id));
    return { ...item, modifiers };
  }));
}

// Calculate time fee (in currency units) for a timed area
function calcTimeFee(openedAt: Date | null, hourlyRate: string | null): number {
  if (!openedAt || !hourlyRate) return 0;
  const elapsedMs = Date.now() - new Date(openedAt).getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  return Math.round(elapsedHours * parseFloat(hourlyRate) * 100) / 100;
}

router.get("/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    const status = req.query.status as string | undefined;
    const tableId = req.query.tableId ? parseInt(req.query.tableId as string) : undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const conditions: SQL[] = [];
    if (outletId) conditions.push(eq(ordersTable.outletId, outletId));
    if (status) conditions.push(eq(ordersTable.status, status as OrderStatus));
    if (tableId) conditions.push(eq(ordersTable.tableId, tableId));
    if (dateFrom) conditions.push(gte(ordersTable.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(ordersTable.createdAt, end));
    }

    const baseQuery = db.select().from(ordersTable);
    const ordersRaw = conditions.length
      ? await baseQuery.where(and(...conditions)).orderBy(desc(ordersTable.createdAt)).limit(limit).offset(offset)
      : await baseQuery.orderBy(desc(ordersTable.createdAt)).limit(limit).offset(offset);

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

router.post("/orders", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const { outletId, tableId, staffId, notes } = req.body as {
      outletId: number;
      tableId: number;
      staffId?: number;
      notes?: string;
    };

    if (!assertOutletAccess(req, outletId)) {
      return res.status(403).json({ error: "Forbidden: cannot create order for another outlet" });
    }

    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, outletId) });
    if (!outlet) return res.status(404).json({ error: "Outlet not found" });

    const table = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, tableId) });
    if (!table || table.outletId !== outletId) {
      return res.status(400).json({ error: "Table does not belong to this outlet" });
    }

    const now = new Date();
    const [order] = await db.insert(ordersTable).values({
      outletId,
      tableId,
      staffId: staffId ?? null,
      notes: notes ?? null,
      status: "open",
      tableOpenedAt: now,
    }).returning();

    await db.update(tablesTable).set({ status: "occupied" }).where(eq(tablesTable.id, tableId));

    return res.status(201).json({ ...order, items: [], payments: [], tableName: "" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, id) });
    if (!order) return res.status(404).json({ error: "Not found" });

    if (!assertOutletAccess(req, order.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const items = await itemsWithModifiers(id);
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, id));
    const table = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, order.tableId) });
    return res.json({ ...order, items, payments, tableName: table?.name ?? "" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/orders/:id", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { status, notes, discountPercent } = req.body as {
      status?: OrderStatus;
      notes?: string;
      discountPercent?: number | null;
    };

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, id) });
    if (!order) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, order.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
    const taxRate = parseFloat(outlet?.taxRate ?? "0");

    if (discountPercent !== undefined) {
      const dpStr = discountPercent !== null ? discountPercent.toString() : null;
      updates.discountPercent = dpStr;
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
      const existingTimeFee = parseFloat(order.timeFee ?? "0");
      const calc = recalcOrder(items, taxRate, dpStr, existingTimeFee);
      updates.subtotal = calc.subtotal.toFixed(2);
      updates.discountAmount = calc.discountAmount.toFixed(2);
      updates.taxAmount = calc.taxAmount.toFixed(2);
      updates.total = calc.total.toFixed(2);
    }

    // When generating the bill for a timed area, auto-calculate time fee
    if (status === "billed") {
      const table = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, order.tableId) });
      let timeFee = 0;
      if (table?.areaId) {
        const area = await db.query.areasTable.findFirst({ where: eq(areasTable.id, table.areaId) });
        if (area?.type === "timed" && area.hourlyRate) {
          timeFee = calcTimeFee(order.tableOpenedAt, area.hourlyRate);
        }
      }
      updates.timeFee = timeFee.toFixed(2);
      // Recalculate total including time fee
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
      const calc = recalcOrder(items, taxRate, order.discountPercent, timeFee);
      updates.subtotal = calc.subtotal.toFixed(2);
      updates.discountAmount = calc.discountAmount.toFixed(2);
      updates.taxAmount = calc.taxAmount.toFixed(2);
      updates.total = calc.total.toFixed(2);
    }

    if (status === "paid" || status === "cancelled") {
      await db.update(tablesTable).set({ status: "available" }).where(eq(tablesTable.id, order.tableId));
    } else if (status === "billed") {
      await db.update(tablesTable).set({ status: "bill_requested" }).where(eq(tablesTable.id, order.tableId));
    }

    const [updated] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();
    const items = await itemsWithModifiers(id);
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, id));
    const table = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, updated.tableId) });
    return res.json({ ...updated, items, payments, tableName: table?.name ?? "" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/:id/items", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id as string);
    const { menuItemId, quantity, notes, modifierOptionIds } = req.body as {
      menuItemId: number;
      quantity?: number;
      notes?: string;
      modifierOptionIds?: number[];
    };

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!assertOutletAccess(req, order.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const menuItem = await db.query.menuItemsTable.findFirst({ where: eq(menuItemsTable.id, menuItemId) });
    if (!menuItem) return res.status(404).json({ error: "Menu item not found" });

    const { menuCategoriesTable } = await import("@workspace/db");
    const category = await db.query.menuCategoriesTable.findFirst({ where: eq(menuCategoriesTable.id, menuItem.categoryId) });
    if (!category || category.outletId !== order.outletId) {
      return res.status(400).json({ error: "Menu item does not belong to this outlet" });
    }

    const qty = quantity ?? 1;
    const unitPrice = parseFloat(menuItem.price);
    const total = unitPrice * qty;

    const [item] = await db.insert(orderItemsTable).values({
      orderId,
      menuItemId,
      menuItemName: menuItem.name,
      quantity: qty,
      unitPrice: unitPrice.toFixed(2),
      total: (unitPrice * qty).toFixed(2),
      notes: notes ?? null,
      kitchenStatus: "pending",
    }).returning();

    let modifierAdj = 0;
    if (modifierOptionIds && modifierOptionIds.length > 0) {
      for (const optId of modifierOptionIds) {
        const opt = await db.query.modifierOptionsTable.findFirst({ where: (t, { eq: eqFn }) => eqFn(t.id, optId) });
        if (!opt) continue;

        const group = await db.query.modifierGroupsTable.findFirst({ where: eq(modifierGroupsTable.id, opt.groupId) });
        if (!group || group.outletId !== order.outletId) {
          return res.status(400).json({ error: `Modifier option ${optId} does not belong to this outlet` });
        }

        await db.insert(orderItemModifiersTable).values({
          orderItemId: item.id,
          modifierOptionId: optId,
          name: opt.name,
          priceAdjustment: opt.priceAdjustment,
        });
        modifierAdj += parseFloat(opt.priceAdjustment);
      }
      if (modifierAdj !== 0) {
        const itemTotal = (unitPrice + modifierAdj) * qty;
        await db.update(orderItemsTable).set({ total: itemTotal.toFixed(2) }).where(eq(orderItemsTable.id, item.id));
        item.total = itemTotal.toFixed(2);
      }
    }

    const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
    const taxRate = parseFloat(outlet?.taxRate ?? "0");
    const existingTimeFee = parseFloat(order.timeFee ?? "0");
    const calc = recalcOrder(allItems, taxRate, order.discountPercent, existingTimeFee);

    await db.update(ordersTable).set({
      subtotal: calc.subtotal.toFixed(2),
      discountAmount: calc.discountAmount.toFixed(2),
      taxAmount: calc.taxAmount.toFixed(2),
      total: calc.total.toFixed(2),
    }).where(eq(ordersTable.id, orderId));

    const modifiers = await db.select().from(orderItemModifiersTable).where(eq(orderItemModifiersTable.orderItemId, item.id));
    return res.status(201).json({ ...item, modifiers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/orders/:id/items/:itemId", requireRole("super_admin", "manager", "cashier", "kitchen"), async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id as string);
    const itemId = parseInt(req.params.itemId as string);
    const { quantity, notes, kitchenStatus } = req.body as {
      quantity?: number;
      notes?: string;
      kitchenStatus?: string;
    };

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!assertOutletAccess(req, order.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const orderItem = await db.query.orderItemsTable.findFirst({ where: eq(orderItemsTable.id, itemId) });
    if (!orderItem) return res.status(404).json({ error: "Item not found" });
    if (orderItem.orderId !== orderId) return res.status(403).json({ error: "Item does not belong to this order" });

    const callerRole = req.session.role!;
    const isKitchenOnly = callerRole === "kitchen";

    const updates: Record<string, unknown> = {};
    if (kitchenStatus !== undefined) {
      updates.kitchenStatus = kitchenStatus;
    }
    if (!isKitchenOnly) {
      if (quantity !== undefined) {
        const existingMods = await db.select().from(orderItemModifiersTable).where(eq(orderItemModifiersTable.orderItemId, itemId));
        const modAdj = existingMods.reduce((s, m) => s + parseFloat(m.priceAdjustment), 0);
        updates.quantity = quantity;
        updates.total = ((parseFloat(orderItem.unitPrice) + modAdj) * quantity).toFixed(2);
      }
      if (notes !== undefined) updates.notes = notes;
    }

    const [updated] = await db.update(orderItemsTable).set(updates).where(eq(orderItemsTable.id, itemId)).returning();

    if (order) {
      const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
      const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
      const taxRate = parseFloat(outlet?.taxRate ?? "0");
      const existingTimeFee = parseFloat(order.timeFee ?? "0");
      const calc = recalcOrder(allItems, taxRate, order.discountPercent, existingTimeFee);
      await db.update(ordersTable).set({
        subtotal: calc.subtotal.toFixed(2),
        discountAmount: calc.discountAmount.toFixed(2),
        taxAmount: calc.taxAmount.toFixed(2),
        total: calc.total.toFixed(2),
      }).where(eq(ordersTable.id, orderId));
    }

    const modifiers = await db.select().from(orderItemModifiersTable).where(eq(orderItemModifiersTable.orderItemId, itemId));
    return res.json({ ...updated, modifiers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/orders/:id/items/:itemId", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id as string);
    const itemId = parseInt(req.params.itemId as string);

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!assertOutletAccess(req, order.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const orderItem = await db.query.orderItemsTable.findFirst({ where: eq(orderItemsTable.id, itemId) });
    if (!orderItem) return res.status(404).json({ error: "Item not found" });
    if (orderItem.orderId !== orderId) return res.status(403).json({ error: "Item does not belong to this order" });

    await db.delete(orderItemModifiersTable).where(eq(orderItemModifiersTable.orderItemId, itemId));
    await db.delete(orderItemsTable).where(eq(orderItemsTable.id, itemId));

    const allItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
    const taxRate = parseFloat(outlet?.taxRate ?? "0");
    const existingTimeFee = parseFloat(order.timeFee ?? "0");
    const calc = recalcOrder(allItems, taxRate, order.discountPercent, existingTimeFee);
    await db.update(ordersTable).set({
      subtotal: calc.subtotal.toFixed(2),
      discountAmount: calc.discountAmount.toFixed(2),
      taxAmount: calc.taxAmount.toFixed(2),
      total: calc.total.toFixed(2),
    }).where(eq(ordersTable.id, orderId));

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id/payments", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id as string);
    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!assertOutletAccess(req, order.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, orderId));
    return res.json(payments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/:id/payments", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id as string);
    const { method, amount, customerId, slipImagePath } = req.body as {
      method: "cash" | "bank_transfer" | "credit";
      amount: number;
      customerId?: number;
      slipImagePath?: string;
    };

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!assertOutletAccess(req, order.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (order.status === "paid") {
      return res.status(409).json({ error: "Order is already paid" });
    }

    if (method === "credit") {
      if (!customerId) return res.status(400).json({ error: "customerId is required for credit payments" });
      const customer = await db.query.customersTable.findFirst({ where: eq(customersTable.id, customerId) });
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      const balance = parseFloat(customer.creditBalance);
      if (balance < amount) return res.status(400).json({ error: "Insufficient credit balance" });
      await db.update(customersTable)
        .set({ creditBalance: (balance - amount).toFixed(2) })
        .where(eq(customersTable.id, customerId));
    }

    if (method === "bank_transfer" && !slipImagePath) {
      return res.status(400).json({ error: "slipImagePath is required for bank transfer payments" });
    }

    const [payment] = await db.insert(paymentsTable).values({
      orderId,
      method,
      amount: amount.toString(),
      customerId: customerId ?? null,
      slipImagePath: slipImagePath ?? null,
    }).returning();

    const [{ totalPaid }] = await db
      .select({ totalPaid: sum(paymentsTable.amount) })
      .from(paymentsTable)
      .where(eq(paymentsTable.orderId, orderId));

    const paidSoFar = parseFloat(totalPaid ?? "0");
    const orderTotal = parseFloat(order.total);

    if (paidSoFar >= orderTotal) {
      await db.update(ordersTable).set({ status: "paid" }).where(eq(ordersTable.id, orderId));
      const updatedOrder = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
      if (updatedOrder) {
        await db.update(tablesTable).set({ status: "available" }).where(eq(tablesTable.id, updatedOrder.tableId));
      }
    }

    return res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
