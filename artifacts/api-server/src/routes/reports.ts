import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, tablesTable, outletsTable, type OrderStatus } from "@workspace/db";
import { requireRole, resolveOutletId } from "../lib/session";

const router = Router();

function getPeriodDates(period: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "today") {
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return { start: today, end };
  } else if (period === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return { start, end };
  } else {
    const start = new Date(today);
    start.setDate(start.getDate() - 30);
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
}

router.get("/reports/outlet", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    if (!outletId) return res.status(400).json({ error: "outletId is required" });

    const period = (req.query.period as string) || "today";
    const { start, end } = getPeriodDates(period);

    const paidStatuses: OrderStatus[] = ["paid"];
    const paidOrders = await db.select().from(ordersTable).where(
      and(
        eq(ordersTable.outletId, outletId),
        inArray(ordersTable.status, paidStatuses),
        gte(ordersTable.createdAt, start),
        lte(ordersTable.createdAt, end)
      )
    );

    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, outletId) });

    const totalRevenue = paidOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const totalOrders = paidOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const allItems = await Promise.all(paidOrders.map(o =>
      db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id))
    ));
    const flatItems = allItems.flat();

    const itemCounts: Record<string, { menuItemId: number; menuItemName: string; quantitySold: number; revenue: number }> = {};
    flatItems.forEach(item => {
      if (!itemCounts[item.menuItemName]) {
        itemCounts[item.menuItemName] = { menuItemId: item.menuItemId, menuItemName: item.menuItemName, quantitySold: 0, revenue: 0 };
      }
      itemCounts[item.menuItemName].quantitySold += item.quantity;
      itemCounts[item.menuItemName].revenue += parseFloat(item.total);
    });
    const topItems = Object.values(itemCounts).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10);

    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    paidOrders.forEach(o => {
      const day = o.createdAt.toISOString().split("T")[0];
      if (!dailyMap[day]) dailyMap[day] = { revenue: 0, orders: 0 };
      dailyMap[day].revenue += parseFloat(o.total);
      dailyMap[day].orders += 1;
    });
    const dailyRevenue = Object.entries(dailyMap).sort().map(([date, d]) => ({
      date,
      revenue: d.revenue,
      orders: d.orders,
    }));

    return res.json({
      outletId,
      outletName: outlet?.name ?? "",
      period,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      topItems,
      dailyRevenue,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/consolidated", requireRole("super_admin"), async (_req: Request, res: Response) => {
  try {
    const period = (_req.query.period as string) || "today";
    const { start, end } = getPeriodDates(period);

    const paidStatuses: OrderStatus[] = ["paid"];
    const [outlets, paidOrders] = await Promise.all([
      db.select().from(outletsTable),
      db.select().from(ordersTable).where(
        and(
          inArray(ordersTable.status, paidStatuses),
          gte(ordersTable.createdAt, start),
          lte(ordersTable.createdAt, end)
        )
      ),
    ]);

    const totalRevenue = paidOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const totalOrders = paidOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const outletBreakdown = outlets.map(outlet => {
      const outletOrders = paidOrders.filter(o => o.outletId === outlet.id);
      const revenue = outletOrders.reduce((s, o) => s + parseFloat(o.total), 0);
      return {
        outletId: outlet.id,
        outletName: outlet.name,
        revenue,
        orders: outletOrders.length,
      };
    });

    const dailyMap: Record<string, { revenue: number; orders: number }> = {};
    paidOrders.forEach(o => {
      const day = o.createdAt.toISOString().split("T")[0];
      if (!dailyMap[day]) dailyMap[day] = { revenue: 0, orders: 0 };
      dailyMap[day].revenue += parseFloat(o.total);
      dailyMap[day].orders += 1;
    });
    const dailyRevenue = Object.entries(dailyMap).sort().map(([date, d]) => ({
      date,
      revenue: d.revenue,
      orders: d.orders,
    }));

    return res.json({ period, totalRevenue, totalOrders, averageOrderValue, outletBreakdown, dailyRevenue });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/dashboard", requireRole("super_admin", "manager", "cashier"), async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const paidStatuses: OrderStatus[] = ["paid"];
    const openStatuses: OrderStatus[] = ["open", "billed"];

    const todayConditions = outletId
      ? and(eq(ordersTable.outletId, outletId), inArray(ordersTable.status, paidStatuses), gte(ordersTable.createdAt, today), lte(ordersTable.createdAt, tomorrow))
      : and(inArray(ordersTable.status, paidStatuses), gte(ordersTable.createdAt, today), lte(ordersTable.createdAt, tomorrow));

    const openConditions = outletId
      ? and(eq(ordersTable.outletId, outletId), inArray(ordersTable.status, openStatuses))
      : inArray(ordersTable.status, openStatuses);

    const [todayOrders, openOrders, tables] = await Promise.all([
      db.select().from(ordersTable).where(todayConditions),
      db.select().from(ordersTable).where(openConditions),
      outletId
        ? db.select().from(tablesTable).where(eq(tablesTable.outletId, outletId))
        : db.select().from(tablesTable),
    ]);

    const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const occupiedTables = tables.filter(t => t.status !== "available").length;

    return res.json({
      todayRevenue,
      todayOrders: todayOrders.length,
      openOrders: openOrders.length,
      occupiedTables,
      totalTables: tables.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
