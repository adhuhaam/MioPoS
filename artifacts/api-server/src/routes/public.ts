import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, outletsTable, menuCategoriesTable, menuItemsTable } from "@workspace/db";

const router = Router();

router.get("/public/menu/:outletId", async (req: Request, res: Response) => {
  try {
    const outletId = parseInt(req.params.outletId, 10);
    if (isNaN(outletId) || outletId <= 0) {
      return res.status(400).json({ error: "Invalid outlet ID" });
    }

    const [outlet] = await db
      .select({
        id: outletsTable.id,
        name: outletsTable.name,
        address: outletsTable.address,
        phone: outletsTable.phone,
        currency: outletsTable.currency,
      })
      .from(outletsTable)
      .where(eq(outletsTable.id, outletId))
      .limit(1);

    if (!outlet) {
      return res.status(404).json({ error: "Outlet not found" });
    }

    const categories = await db
      .select()
      .from(menuCategoriesTable)
      .where(eq(menuCategoriesTable.outletId, outletId))
      .orderBy(menuCategoriesTable.sortOrder);

    const items = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.outletId, outletId))
      .orderBy(menuItemsTable.name);

    return res.json({ outlet, categories, items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
