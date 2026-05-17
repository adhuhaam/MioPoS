import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, areasTable } from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";

const router = Router();

function assertOutletAccess(req: Request, resourceOutletId: number): boolean {
  if (req.session.role === "super_admin") return true;
  return req.session.outletId === resourceOutletId;
}

router.get("/areas", requireRole("super_admin", "manager", "cashier", "waiter"), async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);

    const areas = outletId
      ? await db.select().from(areasTable).where(eq(areasTable.outletId, outletId)).orderBy(areasTable.name)
      : await db.select().from(areasTable).orderBy(areasTable.name);

    return res.json(areas);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/areas", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { outletId, name, type, hourlyRate, color, description } = req.body as {
      outletId: number;
      name: string;
      type?: string;
      hourlyRate?: number | null;
      color?: string;
      description?: string;
    };

    if (!assertOutletAccess(req, outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [area] = await db.insert(areasTable).values({
      outletId,
      name,
      type: (type as "standard" | "timed") ?? "standard",
      hourlyRate: hourlyRate != null ? hourlyRate.toFixed(2) : null,
      color: color ?? "#6366f1",
      description: description ?? null,
    }).returning();

    return res.status(201).json(area);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/areas/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, type, hourlyRate, color, description } = req.body as {
      name?: string;
      type?: string;
      hourlyRate?: number | null;
      color?: string;
      description?: string | null;
    };

    const existing = await db.query.areasTable.findFirst({ where: eq(areasTable.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (hourlyRate !== undefined) updates.hourlyRate = hourlyRate != null ? hourlyRate.toFixed(2) : null;
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description;

    const [area] = await db.update(areasTable).set(updates).where(eq(areasTable.id, id)).returning();
    if (!area) return res.status(404).json({ error: "Not found" });
    return res.json(area);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/areas/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await db.query.areasTable.findFirst({ where: eq(areasTable.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await db.delete(areasTable).where(eq(areasTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
