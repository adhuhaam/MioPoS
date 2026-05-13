import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, or } from "drizzle-orm";
import { db, tablesTable, areasTable, ordersTable } from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";

const router = Router();

function assertOutletAccess(req: Request, resourceOutletId: number): boolean {
  if (req.session.role === "super_admin") return true;
  return req.session.outletId === resourceOutletId;
}

async function tableWithArea(table: typeof tablesTable.$inferSelect) {
  const area = table.areaId
    ? await db.query.areasTable.findFirst({ where: eq(areasTable.id, table.areaId) })
    : null;

  // For occupied/billed timed-area tables, pull the active order's tableOpenedAt
  let tableOpenedAt: string | null = null;
  if (
    area?.type === "timed" &&
    (table.status === "occupied" || table.status === "bill_requested")
  ) {
    const activeOrder = await db.query.ordersTable.findFirst({
      where: and(
        eq(ordersTable.tableId, table.id),
        or(eq(ordersTable.status, "open"), eq(ordersTable.status, "billed"))
      ),
    });
    tableOpenedAt = activeOrder?.tableOpenedAt
      ? activeOrder.tableOpenedAt.toISOString()
      : null;
  }

  return { ...table, area: area ?? null, tableOpenedAt };
}

router.get("/tables", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);

    const tables = outletId
      ? await db.select().from(tablesTable).where(eq(tablesTable.outletId, outletId)).orderBy(tablesTable.name)
      : await db.select().from(tablesTable).orderBy(tablesTable.name);

    const tablesWithArea = await Promise.all(tables.map(tableWithArea));
    return res.json(tablesWithArea);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tables", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { outletId, areaId, name, capacity, status } = req.body as {
      outletId: number;
      areaId?: number | null;
      name: string;
      capacity?: number;
      status?: string;
    };

    if (!assertOutletAccess(req, outletId)) {
      return res.status(403).json({ error: "Forbidden: cannot create table for another outlet" });
    }

    const [table] = await db.insert(tablesTable).values({
      outletId,
      areaId: areaId ?? null,
      name,
      capacity: capacity ?? 4,
      status: (status as "available" | "occupied" | "bill_requested") ?? "available",
    }).returning();

    return res.status(201).json(await tableWithArea(table));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tables/:id", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { areaId, name, capacity, status } = req.body as {
      areaId?: number | null;
      name?: string;
      capacity?: number;
      status?: string;
    };

    const existing = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates: Record<string, unknown> = {};
    if (areaId !== undefined) updates.areaId = areaId;
    if (name !== undefined) updates.name = name;
    if (capacity !== undefined) updates.capacity = capacity;
    if (status !== undefined) updates.status = status;

    const [table] = await db.update(tablesTable).set(updates).where(eq(tablesTable.id, id)).returning();
    if (!table) return res.status(404).json({ error: "Not found" });
    return res.json(await tableWithArea(table));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tables/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await db.query.tablesTable.findFirst({ where: eq(tablesTable.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await db.delete(tablesTable).where(eq(tablesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
