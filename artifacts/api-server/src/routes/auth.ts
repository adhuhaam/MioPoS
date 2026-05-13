import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, staffTable, outletsTable } from "@workspace/db";

const router = Router();

function stripPin<T extends { pin?: string }>(staff: T): Omit<T, "pin"> {
  const { pin: _pin, ...rest } = staff;
  return rest;
}

router.post("/auth/login", async (req, res) => {
  try {
    const { outletId, pin } = req.body as { outletId: number; pin: string };
    if (!outletId || !pin) {
      return res.status(400).json({ error: "outletId and pin are required" });
    }

    const outlet = await db.query.outletsTable.findFirst({
      where: eq(outletsTable.id, outletId),
    });
    if (!outlet) return res.status(401).json({ error: "Invalid credentials" });

    let staff = await db.query.staffTable.findFirst({
      where: and(
        eq(staffTable.outletId, outletId),
        eq(staffTable.pin, pin)
      ),
    });

    if (!staff) {
      const superAdmin = await db.query.staffTable.findFirst({
        where: and(
          eq(staffTable.role, "super_admin"),
          eq(staffTable.pin, pin)
        ),
      });
      if (!superAdmin) return res.status(401).json({ error: "Invalid credentials" });
      staff = superAdmin;
    }

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
    const sessionOutletId = req.session.outletId!;
    const outlet = await db.query.outletsTable.findFirst({
      where: eq(outletsTable.id, sessionOutletId),
    });
    if (!staff || !outlet) return res.status(401).json({ error: "Session invalid" });
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
