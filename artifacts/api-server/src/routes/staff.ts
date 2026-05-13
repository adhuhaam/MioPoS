import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, staffTable, type StaffRole } from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";

const router = Router();

function stripPin<T extends { pin?: string }>(s: T): Omit<T, "pin"> {
  const { pin: _pin, ...rest } = s;
  return rest;
}

function assertOutletAccess(req: Request, resourceOutletId: number | null): boolean {
  if (req.session.role === "super_admin") return true;
  if (resourceOutletId === null) return false;
  return req.session.outletId === resourceOutletId;
}

const MANAGER_ASSIGNABLE_ROLES: StaffRole[] = ["manager", "cashier", "kitchen"];
const ALL_ROLES: StaffRole[] = ["super_admin", "manager", "cashier", "kitchen"];

function isRoleAllowed(requestorRole: string, targetRole: StaffRole): boolean {
  if (requestorRole === "super_admin") return ALL_ROLES.includes(targetRole);
  return MANAGER_ASSIGNABLE_ROLES.includes(targetRole);
}

router.get("/staff", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);

    const staffList = outletId
      ? await db.select().from(staffTable).where(eq(staffTable.outletId, outletId)).orderBy(staffTable.name)
      : await db.select().from(staffTable).orderBy(staffTable.name);
    return res.json(staffList.map(stripPin));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { outletId, name, role, pin } = req.body as {
      outletId?: number | null;
      name: string;
      role: StaffRole;
      pin: string;
    };

    if (!isRoleAllowed(req.session.role!, role)) {
      return res.status(403).json({ error: "Insufficient permissions to assign this role" });
    }

    const targetOutletId = outletId ?? null;
    if (req.session.role !== "super_admin") {
      if (targetOutletId !== req.session.outletId) {
        return res.status(403).json({ error: "Cannot create staff for another outlet" });
      }
    }

    const [member] = await db.insert(staffTable).values({
      outletId: targetOutletId,
      name,
      role,
      pin,
    }).returning();
    return res.status(201).json(stripPin(member));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/staff/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const member = await db.query.staffTable.findFirst({ where: eq(staffTable.id, id) });
    if (!member) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, member.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(stripPin(member));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/staff/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { outletId, name, role, pin } = req.body as {
      outletId?: number | null;
      name?: string;
      role?: StaffRole;
      pin?: string;
    };

    const existing = await db.query.staffTable.findFirst({ where: eq(staffTable.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (role !== undefined && !isRoleAllowed(req.session.role!, role)) {
      return res.status(403).json({ error: "Insufficient permissions to assign this role" });
    }

    if (outletId !== undefined && req.session.role !== "super_admin") {
      if ((outletId ?? null) !== req.session.outletId) {
        return res.status(403).json({ error: "Cannot reassign staff to another outlet" });
      }
    }

    const updates: Record<string, unknown> = {};
    if (outletId !== undefined) updates.outletId = outletId ?? null;
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (pin !== undefined) updates.pin = pin;

    const [member] = await db.update(staffTable).set(updates).where(eq(staffTable.id, id)).returning();
    if (!member) return res.status(404).json({ error: "Not found" });
    return res.json(stripPin(member));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/staff/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await db.query.staffTable.findFirst({ where: eq(staffTable.id, id) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await db.delete(staffTable).where(eq(staffTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
