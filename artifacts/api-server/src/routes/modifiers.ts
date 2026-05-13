import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  modifierGroupsTable,
  modifierOptionsTable,
  orderItemModifiersTable,
  menuItemModifierGroupsTable,
  menuItemsTable,
  ordersTable,
  orderItemsTable,
  type ModifierGroup,
  type ModifierOption,
} from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";

const router = Router();

async function groupWithOptions(group: ModifierGroup): Promise<ModifierGroup & { options: ModifierOption[] }> {
  const options = await db.select().from(modifierOptionsTable).where(eq(modifierOptionsTable.groupId, group.id));
  return { ...group, options };
}

function assertOutletAccess(req: Request, resourceOutletId: number): boolean {
  if (req.session.role === "super_admin") return true;
  return req.session.outletId === resourceOutletId;
}

router.get("/menu/modifiers", requireAuth, async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);

    const groups = outletId
      ? await db.select().from(modifierGroupsTable).where(eq(modifierGroupsTable.outletId, outletId))
      : await db.select().from(modifierGroupsTable);

    const result = await Promise.all(groups.map(groupWithOptions));
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/menu/modifiers", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const { outletId, name, required, multiSelect } = req.body as {
      outletId: number;
      name: string;
      required?: boolean;
      multiSelect?: boolean;
    };

    if (!assertOutletAccess(req, outletId)) {
      return res.status(403).json({ error: "Forbidden: cannot create modifier for another outlet" });
    }

    const [group] = await db.insert(modifierGroupsTable).values({
      outletId,
      name,
      required: required ?? false,
      multiSelect: multiSelect ?? false,
    }).returning();

    return res.status(201).json({ ...group, options: [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/menu/modifiers/:groupId", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId as string);
    const { name, required, multiSelect } = req.body as {
      name?: string;
      required?: boolean;
      multiSelect?: boolean;
    };

    const existing = await db.query.modifierGroupsTable.findFirst({ where: eq(modifierGroupsTable.id, groupId) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (required !== undefined) updates.required = required;
    if (multiSelect !== undefined) updates.multiSelect = multiSelect;

    const [updated] = await db.update(modifierGroupsTable).set(updates).where(eq(modifierGroupsTable.id, groupId)).returning();
    return res.json(await groupWithOptions(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/menu/modifiers/:groupId", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId as string);
    const existing = await db.query.modifierGroupsTable.findFirst({ where: eq(modifierGroupsTable.id, groupId) });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await db.delete(modifierGroupsTable).where(eq(modifierGroupsTable.id, groupId));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/menu/modifiers/:groupId/options", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId as string);
    const { name, priceAdjustment } = req.body as { name: string; priceAdjustment?: number };

    const group = await db.query.modifierGroupsTable.findFirst({ where: eq(modifierGroupsTable.id, groupId) });
    if (!group) return res.status(404).json({ error: "Modifier group not found" });
    if (!assertOutletAccess(req, group.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [option] = await db.insert(modifierOptionsTable).values({
      groupId,
      name,
      priceAdjustment: (priceAdjustment ?? 0).toFixed(2),
    }).returning();
    return res.status(201).json(option);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/menu/modifiers/:groupId/options/:optionId", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId as string);
    const optionId = parseInt(req.params.optionId as string);
    const { name, priceAdjustment } = req.body as { name?: string; priceAdjustment?: number };

    const group = await db.query.modifierGroupsTable.findFirst({ where: eq(modifierGroupsTable.id, groupId) });
    if (!group) return res.status(404).json({ error: "Modifier group not found" });
    if (!assertOutletAccess(req, group.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (priceAdjustment !== undefined) updates.priceAdjustment = priceAdjustment.toFixed(2);

    const [updated] = await db.update(modifierOptionsTable).set(updates).where(eq(modifierOptionsTable.id, optionId)).returning();
    if (!updated) return res.status(404).json({ error: "Option not found" });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/menu/modifiers/:groupId/options/:optionId", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId as string);
    const optionId = parseInt(req.params.optionId as string);

    const group = await db.query.modifierGroupsTable.findFirst({ where: eq(modifierGroupsTable.id, groupId) });
    if (!group) return res.status(404).json({ error: "Modifier group not found" });
    if (!assertOutletAccess(req, group.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(modifierOptionsTable).where(eq(modifierOptionsTable.id, optionId));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Menu Item ↔ Modifier Group assignment ─────────────────────────────────

router.get("/menu/items/:itemId/modifier-groups", requireAuth, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId as string);
    const menuItem = await db.query.menuItemsTable.findFirst({ where: eq(menuItemsTable.id, itemId) });
    if (!menuItem) return res.status(404).json({ error: "Menu item not found" });

    const assignments = await db.select().from(menuItemModifierGroupsTable)
      .where(eq(menuItemModifierGroupsTable.menuItemId, itemId));

    const groups = await Promise.all(assignments.map(async (a) => {
      const group = await db.query.modifierGroupsTable.findFirst({ where: eq(modifierGroupsTable.id, a.modifierGroupId) });
      if (!group) return null;
      return groupWithOptions(group);
    }));

    return res.json(groups.filter(Boolean));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/menu/items/:itemId/modifier-groups", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId as string);
    const { modifierGroupId } = req.body as { modifierGroupId: number };

    const menuItem = await db.query.menuItemsTable.findFirst({ where: eq(menuItemsTable.id, itemId) });
    if (!menuItem) return res.status(404).json({ error: "Menu item not found" });

    const group = await db.query.modifierGroupsTable.findFirst({ where: eq(modifierGroupsTable.id, modifierGroupId) });
    if (!group) return res.status(404).json({ error: "Modifier group not found" });
    if (!assertOutletAccess(req, group.outletId)) return res.status(403).json({ error: "Forbidden" });

    const [assignment] = await db.insert(menuItemModifierGroupsTable).values({
      menuItemId: itemId,
      modifierGroupId,
    }).returning();
    return res.status(201).json(assignment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/menu/items/:itemId/modifier-groups/:groupId", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId as string);
    const groupId = parseInt(req.params.groupId as string);

    const group = await db.query.modifierGroupsTable.findFirst({ where: eq(modifierGroupsTable.id, groupId) });
    if (group && !assertOutletAccess(req, group.outletId)) return res.status(403).json({ error: "Forbidden" });

    await db.delete(menuItemModifierGroupsTable)
      .where(eq(menuItemModifierGroupsTable.menuItemId, itemId));

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/:id/items/:itemId/modifiers", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id as string);
    const itemId = parseInt(req.params.itemId as string);
    const { modifierOptionId } = req.body as { modifierOptionId: number };

    const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!assertOutletAccess(req, order.outletId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const orderItem = await db.query.orderItemsTable.findFirst({ where: eq(orderItemsTable.id, itemId) });
    if (!orderItem) return res.status(404).json({ error: "Order item not found" });
    if (orderItem.orderId !== orderId) {
      return res.status(403).json({ error: "Item does not belong to this order" });
    }

    const option = await db.query.modifierOptionsTable.findFirst({ where: eq(modifierOptionsTable.id, modifierOptionId) });
    if (!option) return res.status(404).json({ error: "Modifier option not found" });

    const [mod] = await db.insert(orderItemModifiersTable).values({
      orderItemId: itemId,
      modifierOptionId,
      name: option.name,
      priceAdjustment: option.priceAdjustment,
    }).returning();
    return res.status(201).json(mod);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
