import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  inventoryItemsTable,
  inventorySupplyLogsTable,
  menuItemRecipesTable,
  menuItemsTable,
} from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";

const router = Router();

function assertOutletAccess(req: Request, resourceOutletId: number): boolean {
  if (req.session.role === "super_admin") return true;
  return req.session.outletId === resourceOutletId;
}

// ─── Inventory Items ────────────────────────────────────────────────────────

router.get("/inventory/items", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    const items = outletId
      ? await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.outletId, outletId)).orderBy(inventoryItemsTable.category, inventoryItemsTable.name)
      : await db.select().from(inventoryItemsTable).orderBy(inventoryItemsTable.outletId, inventoryItemsTable.category, inventoryItemsTable.name);
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/items", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { outletId, name, unit, category, costPerUnit, lowStockThreshold } = req.body as {
      outletId: number; name: string; unit: string; category?: string;
      costPerUnit?: number; lowStockThreshold?: number;
    };
    if (!outletId || !name || !unit) return res.status(400).json({ error: "outletId, name and unit are required" });
    if (!assertOutletAccess(req, outletId)) return res.status(403).json({ error: "Forbidden" });
    const [item] = await db.insert(inventoryItemsTable).values({
      outletId, name, unit,
      category: category ?? null,
      costPerUnit: (costPerUnit ?? 0).toString(),
      lowStockThreshold: (lowStockThreshold ?? 0).toString(),
    }).returning();
    return res.status(201).json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/inventory/items/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await db.query.inventoryItemsTable.findFirst({ where: eq(inventoryItemsTable.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) return res.status(403).json({ error: "Forbidden" });
    const { name, unit, category, costPerUnit, lowStockThreshold } = req.body;
    const [updated] = await db.update(inventoryItemsTable).set({
      ...(name !== undefined && { name }),
      ...(unit !== undefined && { unit }),
      ...(category !== undefined && { category }),
      ...(costPerUnit !== undefined && { costPerUnit: costPerUnit.toString() }),
      ...(lowStockThreshold !== undefined && { lowStockThreshold: lowStockThreshold.toString() }),
    }).where(eq(inventoryItemsTable.id, id)).returning();
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/inventory/items/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await db.query.inventoryItemsTable.findFirst({ where: eq(inventoryItemsTable.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) return res.status(403).json({ error: "Forbidden" });
    await db.delete(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Supply Recording ───────────────────────────────────────────────────────

router.post("/inventory/supply", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { outletId, inventoryItemId, quantity, costPerUnit, note } = req.body as {
      outletId: number; inventoryItemId: number; quantity: number; costPerUnit?: number; note?: string;
    };
    if (!outletId || !inventoryItemId || !quantity) {
      return res.status(400).json({ error: "outletId, inventoryItemId and quantity are required" });
    }
    if (!assertOutletAccess(req, outletId)) return res.status(403).json({ error: "Forbidden" });

    const item = await db.query.inventoryItemsTable.findFirst({ where: eq(inventoryItemsTable.id, inventoryItemId) });
    if (!item) return res.status(404).json({ error: "Inventory item not found" });

    const cpu = costPerUnit ?? parseFloat(item.costPerUnit);
    const totalCost = cpu * quantity;

    const [log] = await db.insert(inventorySupplyLogsTable).values({
      outletId,
      inventoryItemId,
      quantity: quantity.toString(),
      costPerUnit: cpu.toString(),
      totalCost: totalCost.toFixed(2),
      note: note ?? null,
      staffId: req.session.staffId ?? null,
    }).returning();

    // Update current stock
    const newStock = parseFloat(item.currentStock) + quantity;
    await db.update(inventoryItemsTable)
      .set({ currentStock: newStock.toString(), costPerUnit: cpu.toString() })
      .where(eq(inventoryItemsTable.id, inventoryItemId));

    return res.status(201).json(log);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inventory/supply-logs", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const logs = await db
      .select({
        id: inventorySupplyLogsTable.id,
        outletId: inventorySupplyLogsTable.outletId,
        inventoryItemId: inventorySupplyLogsTable.inventoryItemId,
        inventoryItemName: inventoryItemsTable.name,
        unit: inventoryItemsTable.unit,
        quantity: inventorySupplyLogsTable.quantity,
        costPerUnit: inventorySupplyLogsTable.costPerUnit,
        totalCost: inventorySupplyLogsTable.totalCost,
        note: inventorySupplyLogsTable.note,
        suppliedAt: inventorySupplyLogsTable.suppliedAt,
        createdAt: inventorySupplyLogsTable.createdAt,
      })
      .from(inventorySupplyLogsTable)
      .innerJoin(inventoryItemsTable, eq(inventorySupplyLogsTable.inventoryItemId, inventoryItemsTable.id))
      .where(outletId ? eq(inventorySupplyLogsTable.outletId, outletId) : sql`true`)
      .orderBy(desc(inventorySupplyLogsTable.suppliedAt))
      .limit(limit);

    return res.json(logs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Recipe Management ──────────────────────────────────────────────────────

router.get("/menu/items/:menuItemId/recipe", requireAuth, async (req: Request, res: Response) => {
  try {
    const menuItemId = parseInt(req.params.menuItemId as string);
    const recipes = await db
      .select({
        id: menuItemRecipesTable.id,
        menuItemId: menuItemRecipesTable.menuItemId,
        inventoryItemId: menuItemRecipesTable.inventoryItemId,
        inventoryItemName: inventoryItemsTable.name,
        unit: inventoryItemsTable.unit,
        quantity: menuItemRecipesTable.quantity,
        costPerUnit: inventoryItemsTable.costPerUnit,
      })
      .from(menuItemRecipesTable)
      .innerJoin(inventoryItemsTable, eq(menuItemRecipesTable.inventoryItemId, inventoryItemsTable.id))
      .where(eq(menuItemRecipesTable.menuItemId, menuItemId));
    return res.json(recipes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/menu/items/:menuItemId/recipe", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const menuItemId = parseInt(req.params.menuItemId as string);
    const menuItem = await db.query.menuItemsTable.findFirst({ where: eq(menuItemsTable.id, menuItemId) });
    if (!menuItem) return res.status(404).json({ error: "Menu item not found" });
    if (!assertOutletAccess(req, menuItem.outletId)) return res.status(403).json({ error: "Forbidden" });

    const { inventoryItemId, quantity } = req.body as { inventoryItemId: number; quantity: number };
    if (!inventoryItemId || !quantity) return res.status(400).json({ error: "inventoryItemId and quantity are required" });

    // Upsert: delete existing for this pair, then insert
    await db.delete(menuItemRecipesTable).where(
      and(eq(menuItemRecipesTable.menuItemId, menuItemId), eq(menuItemRecipesTable.inventoryItemId, inventoryItemId))
    );
    const [recipe] = await db.insert(menuItemRecipesTable).values({
      menuItemId, inventoryItemId, quantity: quantity.toString(),
    }).returning();

    return res.status(201).json(recipe);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/menu/items/:menuItemId/recipe/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const menuItemId = parseInt(req.params.menuItemId as string);
    const id = parseInt(req.params.id as string);
    await db.delete(menuItemRecipesTable).where(
      and(eq(menuItemRecipesTable.id, id), eq(menuItemRecipesTable.menuItemId, menuItemId))
    );
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
