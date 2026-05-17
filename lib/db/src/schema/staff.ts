import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { outletsTable } from "./outlets";

export const staffRoleEnum = ["super_admin", "manager", "cashier", "waiter", "kitchen"] as const;
export type StaffRole = typeof staffRoleEnum[number];

export const staffTable = pgTable("staff", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").references(() => outletsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  role: text("role").$type<StaffRole>().notNull(),
  pin: text("pin").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStaffSchema = createInsertSchema(staffTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staffTable.$inferSelect;
