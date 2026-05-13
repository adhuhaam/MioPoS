import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, outletsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/session";

const router = Router();

router.get("/outlets", async (_req, res) => {
  try {
    const outlets = await db.select().from(outletsTable).orderBy(outletsTable.name);
    return res.json(outlets);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/outlets", requireRole("super_admin"), async (req, res) => {
  try {
    const { name, address, phone, taxRate, currency } = req.body;
    const [outlet] = await db.insert(outletsTable).values({
      name,
      address: address || "",
      phone: phone || "",
      taxRate: taxRate?.toString() || "0",
      currency: currency || "USD",
    }).returning();
    return res.status(201).json(outlet);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/outlets/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, id) });
    if (!outlet) return res.status(404).json({ error: "Not found" });
    return res.json(outlet);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/outlets/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const callerRole = req.session.role!;
    const callerOutletId = req.session.outletId;

    // Managers may only update their own outlet
    if (callerRole === "manager" && callerOutletId !== id) {
      return res.status(403).json({ error: "Forbidden: managers can only update their own outlet" });
    }

    const { name, address, phone, taxRate, currency } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (taxRate !== undefined) updates.taxRate = taxRate.toString();
    if (currency !== undefined) updates.currency = currency;
    const [outlet] = await db.update(outletsTable).set(updates).where(eq(outletsTable.id, id)).returning();
    if (!outlet) return res.status(404).json({ error: "Not found" });
    return res.json(outlet);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/outlets/:id", requireRole("super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(outletsTable).where(eq(outletsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
