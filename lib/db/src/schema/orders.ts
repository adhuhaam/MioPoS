import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { outletsTable } from "./outlets";
import { tablesTable } from "./tables";
import { staffTable } from "./staff";
import { menuItemsTable } from "./menu";

export const orderStatusEnum = ["open", "billed", "paid", "cancelled"] as const;
export type OrderStatus = typeof orderStatusEnum[number];

export const kitchenStatusEnum = ["pending", "preparing", "ready", "served"] as const;
export type KitchenStatus = typeof kitchenStatusEnum[number];

export const paymentMethodEnum = ["cash", "bank_transfer", "credit"] as const;
export type PaymentMethod = typeof paymentMethodEnum[number];

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id, { onDelete: "cascade" }),
  tableId: integer("table_id").notNull().references(() => tablesTable.id),
  staffId: integer("staff_id").references(() => staffTable.id, { onDelete: "set null" }),
  status: text("status").$type<OrderStatus>().notNull().default("open"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItemsTable.id),
  menuItemName: text("menu_item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  kitchenStatus: text("kitchen_status").$type<KitchenStatus>().notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id"),
  method: text("method").$type<PaymentMethod>().notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  slipImagePath: text("slip_image_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true, createdAt: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
