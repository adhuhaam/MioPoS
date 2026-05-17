import { Router, type Request, type Response } from "express";
import express from "express";
import { randomUUID } from "crypto";
import { eq, sum } from "drizzle-orm";
import {
  db,
  outletsTable,
  menuCategoriesTable,
  menuItemsTable,
  ordersTable,
  paymentsTable,
} from "@workspace/db";
import { ObjectStorageService } from "../lib/objectStorage";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { verifyPayToken } from "../lib/pay-token";
import { hasConfiguredBankTransfer, outletBankDetails } from "../lib/bank-details";
import { orderDisplayLabel, resolveTableName, setTableStatus } from "../lib/order-present";
import { broadcast } from "../lib/broadcaster";
import {
  isLocalObjectStorageEnabled,
  localObjectPath,
  writeLocalUpload,
} from "../lib/local-object-storage";

const router = Router();
const objectStorageService = new ObjectStorageService();

function parseOrderId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getPayToken(req: Request): string | undefined {
  const q = req.query.token ?? req.query.t;
  return typeof q === "string" ? q : undefined;
}

async function loadPayContext(orderId: number, token: string | undefined) {
  const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
  if (!order) return { error: "not_found" as const };
  if (!verifyPayToken(order.payToken, token)) return { error: "forbidden" as const };

  const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
  if (!outlet) return { error: "not_found" as const };

  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, orderId));
  const [{ totalPaid }] = await db
    .select({ totalPaid: sum(paymentsTable.amount) })
    .from(paymentsTable)
    .where(eq(paymentsTable.orderId, orderId));

  const paidSoFar = parseFloat(totalPaid ?? "0");
  const orderTotal = parseFloat(order.total);
  const amountDue = Math.max(0, Math.round((orderTotal - paidSoFar) * 100) / 100);
  const physicalTableName = await resolveTableName(order.tableId);

  return {
    order,
    outlet,
    payments,
    paidSoFar,
    orderTotal,
    amountDue,
    tableName: orderDisplayLabel(order, physicalTableName),
    bank: outletBankDetails(outlet),
    bankReady: hasConfiguredBankTransfer(outlet),
  };
}

router.get("/public/menu/:outletId", async (req: Request, res: Response) => {
  try {
    const outletId = parseInt(req.params.outletId, 10);
    if (isNaN(outletId) || outletId <= 0) {
      return res.status(400).json({ error: "Invalid outlet ID" });
    }

    const [outlet] = await db
      .select({
        id: outletsTable.id,
        name: outletsTable.name,
        address: outletsTable.address,
        phone: outletsTable.phone,
        currency: outletsTable.currency,
      })
      .from(outletsTable)
      .where(eq(outletsTable.id, outletId))
      .limit(1);

    if (!outlet) {
      return res.status(404).json({ error: "Outlet not found" });
    }

    const categories = await db
      .select()
      .from(menuCategoriesTable)
      .where(eq(menuCategoriesTable.outletId, outletId))
      .orderBy(menuCategoriesTable.sortOrder);

    const items = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.outletId, outletId))
      .orderBy(menuItemsTable.name);

    return res.json({ outlet, categories, items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** Customer bank-transfer payment page data */
router.get("/public/pay/:orderId", async (req: Request, res: Response) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    if (!orderId) return res.status(400).json({ error: "Invalid order ID" });

    const ctx = await loadPayContext(orderId, getPayToken(req));
    if ("error" in ctx) {
      if (ctx.error === "forbidden") return res.status(403).json({ error: "Invalid or expired payment link" });
      return res.status(404).json({ error: "Order not found" });
    }

    const { order, outlet, amountDue, paidSoFar, orderTotal, tableName, bank, bankReady, payments } = ctx;

    if (order.status === "cancelled") {
      return res.status(410).json({ error: "This order was cancelled" });
    }
    if (order.status === "paid" || amountDue <= 0) {
      return res.json({
        orderId: order.id,
        status: "paid",
        outletName: outlet.name,
        currency: outlet.currency,
        orderTotal,
        paidSoFar,
        amountDue: 0,
        tableName,
        bank,
        bankReady,
        payments: payments.map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount),
          createdAt: p.createdAt,
        })),
      });
    }

    if (!bankReady) {
      return res.status(503).json({
        error: "Bank transfer is not configured for this outlet. Please pay at the counter.",
        outletName: outlet.name,
      });
    }

    return res.json({
      orderId: order.id,
      status: order.status,
      outletName: outlet.name,
      outletPhone: outlet.phone,
      currency: outlet.currency,
      orderTotal,
      paidSoFar,
      amountDue,
      tableName,
      receiptRef: `RCP-${String(order.id).padStart(6, "0")}`,
      bank,
      bankReady: true,
      payments: payments.map((p) => ({
        method: p.method,
        amount: parseFloat(p.amount),
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/pay/:orderId/request-upload", async (req: Request, res: Response) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    if (!orderId) return res.status(400).json({ error: "Invalid order ID" });

    const ctx = await loadPayContext(orderId, getPayToken(req));
    if ("error" in ctx) {
      if (ctx.error === "forbidden") return res.status(403).json({ error: "Invalid payment link" });
      return res.status(404).json({ error: "Order not found" });
    }
    if (ctx.amountDue <= 0) return res.status(409).json({ error: "Order is already paid" });

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Missing or invalid file metadata" });
    }

    const { name, size, contentType } = parsed.data;

    if (isLocalObjectStorageEnabled()) {
      const uploadId = randomUUID();
      const objectPath = localObjectPath(uploadId);
      const payToken = getPayToken(req);
      const uploadURL = `/api/public/pay/${orderId}/upload-file/${uploadId}?t=${encodeURIComponent(payToken ?? "")}`;
      return res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    }

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    return res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error && err.message.includes("PRIVATE_OBJECT_DIR")
        ? "Object storage is not configured on the server"
        : "Failed to prepare upload";
    return res.status(500).json({ error: message });
  }
});

router.put(
  "/public/pay/:orderId/upload-file/:uploadId",
  express.raw({ type: () => true, limit: "12mb" }),
  async (req: Request, res: Response) => {
    try {
      if (!isLocalObjectStorageEnabled()) {
        return res.status(404).json({ error: "Not found" });
      }

      const orderId = parseOrderId(req.params.orderId);
      const uploadId = req.params.uploadId;
      if (!orderId || !uploadId || !/^[a-f0-9-]{36}$/i.test(uploadId)) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const ctx = await loadPayContext(orderId, getPayToken(req));
      if ("error" in ctx) {
        if (ctx.error === "forbidden") return res.status(403).json({ error: "Invalid payment link" });
        return res.status(404).json({ error: "Order not found" });
      }
      if (ctx.amountDue <= 0) return res.status(409).json({ error: "Order is already paid" });

      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return res.status(400).json({ error: "Empty upload" });
      }

      await writeLocalUpload(uploadId, body);
      return res.status(204).send();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Upload failed" });
    }
  },
);

router.post("/public/pay/:orderId/submit", async (req: Request, res: Response) => {
  try {
    const orderId = parseOrderId(req.params.orderId);
    if (!orderId) return res.status(400).json({ error: "Invalid order ID" });

    const ctx = await loadPayContext(orderId, getPayToken(req));
    if ("error" in ctx) {
      if (ctx.error === "forbidden") return res.status(403).json({ error: "Invalid payment link" });
      return res.status(404).json({ error: "Order not found" });
    }

    const { order, outlet, amountDue } = ctx;
    if (order.status === "cancelled") return res.status(410).json({ error: "Order cancelled" });
    if (amountDue <= 0) return res.status(409).json({ error: "Order is already paid" });
    if (!ctx.bankReady) return res.status(503).json({ error: "Bank transfer not available" });

    const { slipImagePath } = req.body as { slipImagePath?: string };
    if (!slipImagePath?.trim()) {
      return res.status(400).json({ error: "Transfer slip image is required" });
    }

    const payAmount = amountDue;

    await db.insert(paymentsTable).values({
      orderId,
      method: "bank_transfer",
      amount: payAmount.toFixed(2),
      slipImagePath: slipImagePath.trim(),
    });

    const [{ totalPaid }] = await db
      .select({ totalPaid: sum(paymentsTable.amount) })
      .from(paymentsTable)
      .where(eq(paymentsTable.orderId, orderId));

    const paidSoFar = parseFloat(totalPaid ?? "0");
    const orderTotal = parseFloat(order.total);

    if (paidSoFar >= orderTotal) {
      await db.update(ordersTable).set({ status: "paid" }).where(eq(ordersTable.id, orderId));
      await setTableStatus(order.tableId, "available");
    }

    broadcast(order.outletId, { type: "orders" });

    return res.json({
      success: true,
      paidAmount: payAmount,
      amountDue: Math.max(0, orderTotal - paidSoFar),
      status: paidSoFar >= orderTotal ? "paid" : order.status,
      message: paidSoFar >= orderTotal
        ? "Thank you! Your payment has been received."
        : "Transfer recorded. Please contact staff if you believe the amount is incorrect.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to submit payment" });
  }
});

export default router;
