import { Router } from "express";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, tablesTable, outletsTable } from "@workspace/db";

const router = Router();

function getPeriodDates(period: string) {
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

router.get("/reports/outlet", async (req, res) => {
  try {
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const period = (req.query.period as string) || "today";
    const { start, end } = getPeriodDates(period);

    if (!outletId) return res.status(400).json({ error: "outletId is required" });

    const paidOrders = await db.select().from(ordersTable).where(
      and(
        eq(ordersTable.outletId, outletId),
        inArray(ordersTable.status, ["paid"]),
        gte(ordersTable.createdAt, start),
        lte(ordersTable.createdAt, end)
      )
    );

    const revenue = paidOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const orderCount = paidOrders.length;
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    const allItems = await Promise.all(paidOrders.map(o =>
      db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, o.id))
    ));
    const flatItems = allItems.flat();

    const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    flatItems.forEach(item => {
      if (!itemCounts[item.menuItemName]) {
        itemCounts[item.menuItemName] = { name: item.menuItemName, count: 0, revenue: 0 };
      }
      itemCounts[item.menuItemName].count += item.quantity;
      itemCounts[item.menuItemName].revenue += parseFloat(item.total);
    });
    const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 10);

    const dailyMap: Record<string, number> = {};
    paidOrders.forEach(o => {
      const day = o.createdAt.toISOString().split("T")[0];
      dailyMap[day] = (dailyMap[day] || 0) + parseFloat(o.total);
    });
    const dailyRevenue = Object.entries(dailyMap).sort().map(([date, revenue]) => ({ date, revenue }));

    return res.json({ outletId, period, revenue, orderCount, avgOrderValue, topItems, dailyRevenue });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/consolidated", async (req, res) => {
  try {
    const period = (req.query.period as string) || "today";
    const { start, end } = getPeriodDates(period);

    const outlets = await db.select().from(outletsTable);
    const paidOrders = await db.select().from(ordersTable).where(
      and(
        inArray(ordersTable.status, ["paid"]),
        gte(ordersTable.createdAt, start),
        lte(ordersTable.createdAt, end)
      )
    );

    const totalRevenue = paidOrders.reduce((s, o) => s + parseFloat(o.total), 0);
    const totalOrders = paidOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const outletBreakdown = outlets.map(outlet => {
      const outletOrders = paidOrders.filter(o => o.outletId === outlet.id);
      const revenue = outletOrders.reduce((s, o) => s + parseFloat(o.total), 0);
      return { outletId: outlet.id, outletName: outlet.name, revenue, orderCount: outletOrders.length };
    });

    const dailyMap: Record<string, number> = {};
    paidOrders.forEach(o => {
      const day = o.createdAt.toISOString().split("T")[0];
      dailyMap[day] = (dailyMap[day] || 0) + parseFloat(o.total);
    });
    const dailyRevenue = Object.entries(dailyMap).sort().map(([date, revenue]) => ({ date, revenue }));

    return res.json({ period, totalRevenue, totalOrders, avgOrderValue, outletBreakdown, dailyRevenue });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/dashboard", async (req, res) => {
  try {
    const outletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayConditions = outletId
      ? and(eq(ordersTable.outletId, outletId), inArray(ordersTable.status, ["paid"]), gte(ordersTable.createdAt, today), lte(ordersTable.createdAt, tomorrow))
      : and(inArray(ordersTable.status, ["paid"]), gte(ordersTable.createdAt, today), lte(ordersTable.createdAt, tomorrow));

    const openConditions = outletId
      ? and(eq(ordersTable.outletId, outletId), inArray(ordersTable.status, ["open", "billed"]))
      : inArray(ordersTable.status, ["open", "billed"]);

    const tableConditions = outletId
      ? eq(tablesTable.outletId, outletId)
      : undefined;

    const [todayOrders, openOrders, tables] = await Promise.all([
      db.select().from(ordersTable).where(todayConditions),
      db.select().from(ordersTable).where(openConditions),
      tableConditions ? db.select().from(tablesTable).where(tableConditions) : db.select().from(tablesTable),
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
