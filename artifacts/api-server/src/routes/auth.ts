import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, staffTable, outletsTable } from "@workspace/db";

const router = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { outletId, pin } = req.body as { outletId: number; pin: string };
    if (!outletId || !pin) {
      return res.status(400).json({ error: "outletId and pin are required" });
    }

    const staff = await db.query.staffTable.findFirst({
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
      if (superAdmin) {
        const outlet = await db.query.outletsTable.findFirst({
          where: eq(outletsTable.id, outletId),
        });
        if (!outlet) return res.status(401).json({ error: "Invalid credentials" });
        return res.json({ staff: superAdmin, outlet });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const outlet = await db.query.outletsTable.findFirst({
      where: eq(outletsTable.id, outletId),
    });

    if (!outlet) return res.status(401).json({ error: "Outlet not found" });

    return res.json({ staff, outlet });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", (_req, res) => {
  return res.status(401).json({ error: "Not authenticated" });
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true });
});

export default router;
