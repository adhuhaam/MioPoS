import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { outletsTable } from "./outlets";
import { staffTable } from "./staff";

/** Supplier purchase invoices for MIRA Input Tax Statement. */
export const purchaseInvoicesTable = pgTable("purchase_invoices", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id, { onDelete: "cascade" }),
  supplierName: text("supplier_name").notNull(),
  supplierTin: text("supplier_tin").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  notes: text("notes"),
  staffId: integer("staff_id").references(() => staffTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPurchaseInvoiceSchema = createInsertSchema(purchaseInvoicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;
export type PurchaseInvoice = typeof purchaseInvoicesTable.$inferSelect;
