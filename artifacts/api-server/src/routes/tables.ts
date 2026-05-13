import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, tablesTable } from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";

const router = Router();

router.get("/tables", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);

    const tables = outletId
      ? await db.select().from(tablesTable).where(eq(tablesTable.outletId, outletId)).orderBy(tablesTable.name)
      : await db.select().from(tablesTable).orderBy(tablesTable.name);
    return res.json(tables);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tables", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { outletId, name, capacity, status } = req.body as {
      outletId: number;
      name: string;
      capacity?: number;
      status?: string;
    };
    const [table] = await db.insert(tablesTable).values({
      outletId,
      name,
      capacity: capacity ?? 4,
      status: (status as "available" | "occupied" | "bill_requested") ?? "available",
    }).returning();
    return res.status(201).json(table);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tables/:id", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, capacity, status } = req.body as { name?: string; capacity?: number; status?: string };
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (capacity !== undefined) updates.capacity = capacity;
    if (status !== undefined) updates.status = status;
    const [table] = await db.update(tablesTable).set(updates).where(eq(tablesTable.id, id)).returning();
    if (!table) return res.status(404).json({ error: "Not found" });
    return res.json(table);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tables/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(tablesTable).where(eq(tablesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
