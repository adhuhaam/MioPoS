import { Router } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, staffTable, outletsTable } from "@workspace/db";
import { getDefaultCurrency } from "../lib/app-settings";

const router = Router();

async function superAdminOutlet() {
  return {
    id: 0,
    name: "All Outlets",
    address: "",
    phone: "",
    currency: await getDefaultCurrency(),
    taxRate: 0,
  };
}

function stripPin<T extends { pin?: string }>(staff: T): Omit<T, "pin"> {
  const { pin: _pin, ...rest } = staff;
  return rest;
}

router.post("/auth/login", async (req, res) => {
  try {
    const { outletId, pin } = req.body as { outletId?: number | null; pin: string };

    if (!pin) {
      return res.status(400).json({ error: "PIN is required" });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: "PIN must be exactly 4 digits" });
    }

    // ── Super admin login (no outlet selected) ────────────────────────────
    if (!outletId) {
      const superAdmins = await db.query.staffTable.findMany({
        where: eq(staffTable.role, "super_admin"),
      });
      let staff = null;
      for (const sa of superAdmins) {
        if (await bcrypt.compare(pin, sa.pin)) { staff = sa; break; }
      }
      if (!staff) return res.status(401).json({ error: "Invalid credentials" });

      req.session.staffId = staff.id;
      req.session.outletId = null;
      req.session.role = staff.role;
      return res.json({ staff: stripPin(staff), outlet: await superAdminOutlet() });
    }

    // ── Outlet staff login ────────────────────────────────────────────────
    const outlet = await db.query.outletsTable.findFirst({
      where: eq(outletsTable.id, outletId),
    });
    if (!outlet) return res.status(401).json({ error: "Invalid credentials" });

    const candidates = await db.query.staffTable.findMany({
      where: eq(staffTable.outletId, outletId),
    });
    let staff = null;
    for (const c of candidates) {
      if (await bcrypt.compare(pin, c.pin)) { staff = c; break; }
    }

    // Fall back to super_admin who can log into any outlet
    if (!staff) {
      const superAdmins = await db.query.staffTable.findMany({
        where: eq(staffTable.role, "super_admin"),
      });
      for (const sa of superAdmins) {
        if (await bcrypt.compare(pin, sa.pin)) { staff = sa; break; }
      }
    }

    if (!staff) return res.status(401).json({ error: "Invalid credentials" });

    req.session.staffId = staff.id;
    req.session.outletId = outletId;
    req.session.role = staff.role;
    return res.json({ staff: stripPin(staff), outlet });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", async (req, res) => {
  if (!req.session?.staffId) return res.status(401).json({ error: "Not authenticated" });
  try {
    const staff = await db.query.staffTable.findFirst({
      where: eq(staffTable.id, req.session.staffId),
    });
    if (!staff) return res.status(401).json({ error: "Session invalid" });

    // Super admin session has no outlet
    if (!req.session.outletId) {
      return res.json({ staff: stripPin(staff), outlet: await superAdminOutlet() });
    }

    const outlet = await db.query.outletsTable.findFirst({
      where: eq(outletsTable.id, req.session.outletId),
    });
    if (!outlet) return res.status(401).json({ error: "Session invalid" });
    return res.json({ staff: stripPin(staff), outlet });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {});
  return res.json({ success: true });
});

export default router;
