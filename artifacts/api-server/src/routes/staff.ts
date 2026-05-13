import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, staffTable } from "@workspace/db";

const router = Router();

router.get("/staff", async (req, res) => {
  try {
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const staff = outletId
      ? await db.select().from(staffTable).where(eq(staffTable.outletId, outletId)).orderBy(staffTable.name)
      : await db.select().from(staffTable).orderBy(staffTable.name);
    return res.json(staff.map(s => ({ ...s, pin: undefined })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff", async (req, res) => {
  try {
    const { outletId, name, role, pin } = req.body;
    const [member] = await db.insert(staffTable).values({ outletId: outletId || null, name, role, pin }).returning();
    return res.status(201).json({ ...member, pin: undefined });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/staff/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const member = await db.query.staffTable.findFirst({ where: eq(staffTable.id, id) });
    if (!member) return res.status(404).json({ error: "Not found" });
    return res.json({ ...member, pin: undefined });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/staff/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { outletId, name, role, pin } = req.body;
    const updates: Record<string, unknown> = {};
    if (outletId !== undefined) updates.outletId = outletId || null;
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (pin !== undefined) updates.pin = pin;
    const [member] = await db.update(staffTable).set(updates).where(eq(staffTable.id, id)).returning();
    if (!member) return res.status(404).json({ error: "Not found" });
    return res.json({ ...member, pin: undefined });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/staff/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(staffTable).where(eq(staffTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
