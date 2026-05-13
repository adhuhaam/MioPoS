import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, menuCategoriesTable, menuItemsTable } from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";

const router = Router();

router.get("/menu/categories", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);

    const cats = outletId
      ? await db.select().from(menuCategoriesTable).where(eq(menuCategoriesTable.outletId, outletId)).orderBy(menuCategoriesTable.sortOrder)
      : await db.select().from(menuCategoriesTable).orderBy(menuCategoriesTable.sortOrder);
    return res.json(cats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/menu/categories", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { outletId, name, sortOrder } = req.body as { outletId: number; name: string; sortOrder?: number };
    const [cat] = await db.insert(menuCategoriesTable).values({ outletId, name, sortOrder: sortOrder ?? 0 }).returning();
    return res.status(201).json(cat);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/menu/categories/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, sortOrder } = req.body as { name?: string; sortOrder?: number };
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    const [cat] = await db.update(menuCategoriesTable).set(updates).where(eq(menuCategoriesTable.id, id)).returning();
    if (!cat) return res.status(404).json({ error: "Not found" });
    return res.json(cat);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/menu/categories/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(menuCategoriesTable).where(eq(menuCategoriesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/menu/items", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);

    let items;
    if (outletId) {
      items = await db.select().from(menuItemsTable).where(eq(menuItemsTable.outletId, outletId)).orderBy(menuItemsTable.name);
    } else if (categoryId) {
      items = await db.select().from(menuItemsTable).where(eq(menuItemsTable.categoryId, categoryId)).orderBy(menuItemsTable.name);
    } else {
      items = await db.select().from(menuItemsTable).orderBy(menuItemsTable.name);
    }
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/menu/items", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { categoryId, outletId, name, description, price, available } = req.body as {
      categoryId: number;
      outletId: number;
      name: string;
      description?: string | null;
      price: number;
      available?: boolean;
    };
    const [item] = await db.insert(menuItemsTable).values({
      categoryId,
      outletId,
      name,
      description: description ?? null,
      price: price.toString(),
      available: available ?? true,
    }).returning();
    return res.status(201).json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/menu/items/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { categoryId, name, description, price, available } = req.body as {
      categoryId?: number;
      name?: string;
      description?: string | null;
      price?: number;
      available?: boolean;
    };
    const updates: Record<string, unknown> = {};
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price.toString();
    if (available !== undefined) updates.available = available;
    const [item] = await db.update(menuItemsTable).set(updates).where(eq(menuItemsTable.id, id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/menu/items/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
