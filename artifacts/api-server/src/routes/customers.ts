import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";

const router = Router();

function assertOutletAccess(req: Request, resourceOutletId: number | null): boolean {
  if (req.session.role === "super_admin") return true;
  if (resourceOutletId === null) return true;
  return req.session.outletId === resourceOutletId;
}

router.get("/customers", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    const search = req.query.search as string | undefined;

    const conditions = [];
    if (outletId) conditions.push(eq(customersTable.outletId, outletId));
    if (search) {
      conditions.push(
        or(
          ilike(customersTable.name, `%${search}%`),
          ilike(customersTable.phone!, `%${search}%`),
          ilike(customersTable.email!, `%${search}%`)
        )
      );
    }

    const customers = conditions.length
      ? await db.select().from(customersTable).where(and(...conditions)).orderBy(customersTable.name)
      : await db.select().from(customersTable).orderBy(customersTable.name);

    return res.json(customers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers", requireRole("super_admin", "manager", "cashier", "waiter"), async (req: Request, res: Response) => {
  try {
    const { name, phone, email, notes, outletId: bodyOutletId } = req.body as {
      name: string;
      phone?: string;
      email?: string;
      notes?: string;
      outletId?: number;
    };

    if (!name?.trim()) return res.status(400).json({ error: "name is required" });

    const outletId = req.session.role === "super_admin" ? (bodyOutletId ?? req.session.outletId ?? null) : req.session.outletId!;

    const [customer] = await db.insert(customersTable).values({
      outletId: outletId ?? null,
      name: name.trim(),
      phone: phone ?? null,
      email: email ?? null,
      notes: notes ?? null,
      creditBalance: "0",
    }).returning();

    return res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const customer = await db.query.customersTable.findFirst({ where: eq(customersTable.id, id) });
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    if (!assertOutletAccess(req, customer.outletId)) return res.status(403).json({ error: "Forbidden" });
    return res.json(customer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/customers/:id", requireRole("super_admin", "manager", "cashier", "waiter"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, phone, email, notes } = req.body as {
      name?: string;
      phone?: string;
      email?: string;
      notes?: string;
    };

    const existing = await db.query.customersTable.findFirst({ where: eq(customersTable.id, id) });
    if (!existing) return res.status(404).json({ error: "Customer not found" });
    if (!assertOutletAccess(req, existing.outletId)) return res.status(403).json({ error: "Forbidden" });

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (notes !== undefined) updates.notes = notes;

    const [customer] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
    return res.json(customer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers/:id/credit", requireRole("super_admin", "manager", "cashier", "waiter"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { amount, operation } = req.body as { amount: number; operation: "add" | "deduct" };

    const customer = await db.query.customersTable.findFirst({ where: eq(customersTable.id, id) });
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    if (!assertOutletAccess(req, customer.outletId)) return res.status(403).json({ error: "Forbidden" });

    const current = parseFloat(customer.creditBalance);
    const delta = operation === "deduct" ? -Math.abs(amount) : Math.abs(amount);
    const newBalance = current + delta;

    if (newBalance < 0) return res.status(400).json({ error: "Insufficient credit balance" });

    const [updated] = await db.update(customersTable)
      .set({ creditBalance: newBalance.toFixed(2) })
      .where(eq(customersTable.id, id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/customers/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const customer = await db.query.customersTable.findFirst({ where: eq(customersTable.id, id) });
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    if (!assertOutletAccess(req, customer.outletId)) return res.status(403).json({ error: "Forbidden" });
    await db.delete(customersTable).where(eq(customersTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
