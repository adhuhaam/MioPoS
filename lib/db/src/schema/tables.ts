import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { outletsTable } from "./outlets";

// ── Areas ──────────────────────────────────────────────────────────────────
export const areaTypeEnum = ["standard", "timed"] as const;
export type AreaType = typeof areaTypeEnum[number];

export const areasTable = pgTable("areas", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").$type<AreaType>().notNull().default("standard"),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  color: text("color").notNull().default("#6366f1"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAreaSchema = createInsertSchema(areasTable).omit({ id: true, createdAt: true });
export type InsertArea = z.infer<typeof insertAreaSchema>;
export type Area = typeof areasTable.$inferSelect;

// ── Tables ─────────────────────────────────────────────────────────────────
export const tableStatusEnum = ["available", "occupied", "bill_requested"] as const;
export type TableStatus = typeof tableStatusEnum[number];

export const tablesTable = pgTable("tables", {
  id: serial("id").primaryKey(),
  outletId: integer("outlet_id").notNull().references(() => outletsTable.id, { onDelete: "cascade" }),
  areaId: integer("area_id").references(() => areasTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull().default(4),
  status: text("status").$type<TableStatus>().notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTableSchema = createInsertSchema(tablesTable).omit({ id: true, createdAt: true });
export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tablesTable.$inferSelect;
