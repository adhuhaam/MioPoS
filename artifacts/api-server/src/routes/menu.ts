import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, menuCategoriesTable, menuItemsTable } from "@workspace/db";

const router = Router();

router.get("/menu/categories", async (req, res) => {
  try {
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const cats = outletId
      ? await db.select().from(menuCategoriesTable).where(eq(menuCategoriesTable.outletId, outletId)).orderBy(menuCategoriesTable.sortOrder)
      : await db.select().from(menuCategoriesTable).orderBy(menuCategoriesTable.sortOrder);
    return res.json(cats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/menu/categories", async (req, res) => {
  try {
    const { outletId, name, sortOrder } = req.body;
    const [cat] = await db.insert(menuCategoriesTable).values({ outletId, name, sortOrder: sortOrder ?? 0 }).returning();
    return res.status(201).json(cat);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/menu/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, sortOrder } = req.body;
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

router.delete("/menu/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(menuCategoriesTable).where(eq(menuCategoriesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/menu/items", async (req, res) => {
  try {
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    let query = db.select().from(menuItemsTable);
    if (outletId) query = query.where(eq(menuItemsTable.outletId, outletId)) as typeof query;
    else if (categoryId) query = query.where(eq(menuItemsTable.categoryId, categoryId)) as typeof query;
    const items = await query.orderBy(menuItemsTable.name);
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/menu/items", async (req, res) => {
  try {
    const { categoryId, outletId, name, description, price, available } = req.body;
    const [item] = await db.insert(menuItemsTable).values({
      categoryId,
      outletId,
      name,
      description: description || null,
      price: price.toString(),
      available: available ?? true,
    }).returning();
    return res.status(201).json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/menu/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, name, description, price, available } = req.body;
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

router.delete("/menu/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
