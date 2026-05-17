import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, gte, lt, lte, inArray, sql } from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  tablesTable,
  outletsTable,
  purchaseInvoicesTable,
  paymentsTable,
  type OrderStatus,
} from "@workspace/db";
import { requireRole, resolveOutletId } from "../lib/session";
import { parseReportDateRange } from "../lib/report-dates";

const router = Router();

function receiptRef(orderId: number): string {
  return `RCP-${String(orderId).padStart(6, "0")}`;
}

function getPeriodDates(period: string): { start: Date; end: Date } {
  return parseReportDateRange(undefined, undefined, period);
}

function resolveReportRange(req: Request): { start: Date; end: Date; label: string } {
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const period = req.query.period as string | undefined;
  return parseReportDateRange(dateFrom, dateTo, period);
}

/** When the sale was completed (payment time, or last order update). */
const orderSaleAt = sql<Date>`COALESCE(
  (SELECT MAX(${paymentsTable.createdAt}) FROM ${paymentsTable} WHERE ${paymentsTable.orderId} = ${ordersTable.id}),
  ${ordersTable.updatedAt},
  ${ordersTable.createdAt}
)`;

function paidOrderInDateRange(start: Date, end: Date) {
  return and(gte(orderSaleAt, start), lte(orderSaleAt, end));
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

router.get("/reports/tax/summary", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    if (!outletId) return res.status(400).json({ error: "outletId is required" });

    const { start, end, label } = resolveReportRange(req);
    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, outletId) });
    if (!outlet) return res.status(404).json({ error: "Outlet not found" });

    const taxRate = parseFloat(outlet.taxRate ?? "8");

    const paidOrders = await db.select().from(ordersTable).where(
      and(
        eq(ordersTable.outletId, outletId),
        inArray(ordersTable.status, ["paid"] as OrderStatus[]),
        paidOrderInDateRange(start, end),
      ),
    );

    let outputTaxable = 0;
    let outputGst = 0;
    let outputTotal = 0;
    let outputTimeFee = 0;
    for (const o of paidOrders) {
      const sub = parseFloat(o.subtotal);
      const disc = parseFloat(o.discountAmount ?? "0");
      outputTaxable += sub - disc;
      outputGst += parseFloat(o.taxAmount ?? "0");
      outputTimeFee += parseFloat(o.timeFee ?? "0");
      outputTotal += parseFloat(o.total);
    }

    const purchases = await db.select().from(purchaseInvoicesTable).where(
      and(
        eq(purchaseInvoicesTable.outletId, outletId),
        gte(purchaseInvoicesTable.invoiceDate, start),
        lte(purchaseInvoicesTable.invoiceDate, end),
      ),
    );

    let inputTaxable = 0;
    let inputGst = 0;
    for (const p of purchases) {
      inputTaxable += parseFloat(p.subtotal);
      inputGst += parseFloat(p.gstAmount);
    }

    const netGstPayable = outputGst - inputGst;

    return res.json({
      outletId,
      outletName: outlet.name,
      businessTin: outlet.businessTin ?? null,
      taxRate,
      periodLabel: label,
      dateFrom: req.query.dateFrom ?? start.toISOString().slice(0, 10),
      dateTo: req.query.dateTo ?? end.toISOString().slice(0, 10),
      output: {
        orderCount: paidOrders.length,
        taxableSales: outputTaxable,
        gstCollected: outputGst,
        timeFees: outputTimeFee,
        grossSales: outputTotal,
      },
      input: {
        invoiceCount: purchases.length,
        taxablePurchases: inputTaxable,
        gstPaid: inputGst,
        grossPurchases: inputTaxable + inputGst,
      },
      mira205: {
        box3TotalSales: outputTaxable + outputGst + outputTimeFee,
        outputGst,
        inputGst,
        netGstPayable,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid date range") {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/tax/output", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    if (!outletId) return res.status(400).json({ error: "outletId is required" });

    const { start, end, label } = resolveReportRange(req);
    const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, outletId) });
    const taxRate = parseFloat(outlet?.taxRate ?? "8");

    const paidOrders = await db.select().from(ordersTable).where(
      and(
        eq(ordersTable.outletId, outletId),
        inArray(ordersTable.status, ["paid"] as OrderStatus[]),
        paidOrderInDateRange(start, end),
      ),
    );

    const orderIds = paidOrders.map((o) => o.id);
    const allPayments =
      orderIds.length > 0
        ? await db.select().from(paymentsTable).where(inArray(paymentsTable.orderId, orderIds))
        : [];

    const lines = paidOrders.map((o) => {
      const sub = parseFloat(o.subtotal);
      const disc = parseFloat(o.discountAmount ?? "0");
      const taxable = sub - disc;
      const gst = parseFloat(o.taxAmount ?? "0");
      const timeFee = parseFloat(o.timeFee ?? "0");
      const payments = allPayments.filter((p) => p.orderId === o.id);
      return {
        orderId: o.id,
        invoiceNumber: receiptRef(o.id),
        invoiceDate: (o.updatedAt ?? o.createdAt).toISOString().slice(0, 10),
        serviceType: o.serviceType,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        taxableAmount: taxable,
        gstAmount: gst,
        timeFee,
        totalAmount: parseFloat(o.total),
        taxRate,
        paymentMethods: [...new Set(payments.map((p) => p.method))],
        itemCount: 0,
      };
    });

    if (orderIds.length > 0) {
      const itemRows = await db
        .select({ orderId: orderItemsTable.orderId })
        .from(orderItemsTable)
        .where(inArray(orderItemsTable.orderId, orderIds));
      const countMap = new Map<number, number>();
      for (const row of itemRows) {
        countMap.set(row.orderId, (countMap.get(row.orderId) ?? 0) + 1);
      }
      for (const line of lines) {
        line.itemCount = countMap.get(line.orderId) ?? 0;
      }
    }

    lines.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate) || a.orderId - b.orderId);

    return res.json({
      outletId,
      outletName: outlet?.name ?? "",
      periodLabel: label,
      taxRate,
      lines,
      totals: {
        count: lines.length,
        taxableAmount: lines.reduce((s, l) => s + l.taxableAmount, 0),
        gstAmount: lines.reduce((s, l) => s + l.gstAmount, 0),
        totalAmount: lines.reduce((s, l) => s + l.totalAmount, 0),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid date range") {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/tax/input", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    if (!outletId) return res.status(400).json({ error: "outletId is required" });

    const { start, end, label } = resolveReportRange(req);

    const purchases = await db
      .select()
      .from(purchaseInvoicesTable)
      .where(
        and(
          eq(purchaseInvoicesTable.outletId, outletId),
          gte(purchaseInvoicesTable.invoiceDate, start),
          lte(purchaseInvoicesTable.invoiceDate, end),
        ),
      )
      .orderBy(purchaseInvoicesTable.invoiceDate);

    const lines = purchases.map((p, index) => ({
      lineNo: index + 1,
      id: p.id,
      supplierName: p.supplierName,
      supplierTin: p.supplierTin,
      invoiceDate: p.invoiceDate.toISOString().slice(0, 10),
      invoiceNumber: p.invoiceNumber,
      subtotal: parseFloat(p.subtotal),
      gstAmount: parseFloat(p.gstAmount),
      total: parseFloat(p.subtotal) + parseFloat(p.gstAmount),
      description: p.description,
      notes: p.notes,
    }));

    return res.json({
      outletId,
      periodLabel: label,
      lines,
      totals: {
        count: lines.length,
        subtotal: lines.reduce((s, l) => s + l.subtotal, 0),
        gstAmount: lines.reduce((s, l) => s + l.gstAmount, 0),
        total: lines.reduce((s, l) => s + l.total, 0),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid date range") {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
