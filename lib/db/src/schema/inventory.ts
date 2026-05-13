import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { outletsTable } from "./outlets";
import { staffTable } from "./staff";
import { menuItemsTable } from "./menu";

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("piece"),
  category: text("category"),
  currentStock: numeric("current_stock", { precision: 14, scale: 4 }).notNull().default("0"),
  costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 4 }).notNull().default("0"),
  lowStockThreshold: numeric("low_stock_threshold", { precision: 14, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const inventorySupplyLogsTable = pgTable("inventory_supply_logs", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id, { onDelete: "cascade" }),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItemsTable.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  costPerUnit: numeric("cost_per_unit", { precision: 10, scale: 4 }),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }),
  note: text("note"),
  suppliedAt: timestamp("supplied_at", { withTimezone: true }).notNull().defaultNow(),
  staffId: integer("staff_id").references(() => staffTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menuItemRecipesTable = pgTable("menu_item_recipes", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItemsTable.id, { onDelete: "cascade" }),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItemsTable.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;

export const insertInventorySupplyLogSchema = createInsertSchema(inventorySupplyLogsTable).omit({ id: true, createdAt: true });
export type InsertInventorySupplyLog = z.infer<typeof insertInventorySupplyLogSchema>;
export type InventorySupplyLog = typeof inventorySupplyLogsTable.$inferSelect;

export const insertMenuItemRecipeSchema = createInsertSchema(menuItemRecipesTable).omit({ id: true, createdAt: true });
export type InsertMenuItemRecipe = z.infer<typeof insertMenuItemRecipeSchema>;
export type MenuItemRecipe = typeof menuItemRecipesTable.$inferSelect;
