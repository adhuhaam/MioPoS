import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { outletsTable } from "./outlets";

export const tableStatusEnum = ["available", "occupied", "bill_requested"] as const;
export type TableStatus = typeof tableStatusEnum[number];

export const tablesTable = pgTable("tables", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull().default(4),
  status: text("status").$type<TableStatus>().notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTableSchema = createInsertSchema(tablesTable).omit({ id: true, createdAt: true });
export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tablesTable.$inferSelect;
