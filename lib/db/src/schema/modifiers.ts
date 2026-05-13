import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { outletsTable } from "./outlets";
import { orderItemsTable } from "./orders";
import { menuItemsTable } from "./menu";

export const modifierGroupsTable = pgTable("modifier_groups", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  required: boolean("required").notNull().default(false),
  multiSelect: boolean("multi_select").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modifierOptionsTable = pgTable("modifier_options", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => modifierGroupsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceAdjustment: numeric("price_adjustment", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const menuItemModifierGroupsTable = pgTable("menu_item_modifier_groups", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItemsTable.id, { onDelete: "cascade" }),
  modifierGroupId: integer("modifier_group_id").notNull().references(() => modifierGroupsTable.id, { onDelete: "cascade" }),
});

export const orderItemModifiersTable = pgTable("order_item_modifiers", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id").notNull().references(() => orderItemsTable.id, { onDelete: "cascade" }),
  modifierOptionId: integer("modifier_option_id").notNull().references(() => modifierOptionsTable.id),
  name: text("name").notNull(),
  priceAdjustment: numeric("price_adjustment", { precision: 10, scale: 2 }).notNull().default("0"),
});

export type ModifierGroup = typeof modifierGroupsTable.$inferSelect;
export type ModifierOption = typeof modifierOptionsTable.$inferSelect;
export type MenuItemModifierGroup = typeof menuItemModifierGroupsTable.$inferSelect;
export type OrderItemModifier = typeof orderItemModifiersTable.$inferSelect;
