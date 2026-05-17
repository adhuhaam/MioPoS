import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, purchaseInvoicesTable } from "@workspace/db";
import { requireAuth, requireRole, resolveOutletId } from "../lib/session";
import { parseReportDateRange } from "../lib/report-dates";

const router = Router();

function assertOutletAccess(req: Request, resourceOutletId: number): boolean {
  if (req.session.role === "super_admin") return true;
  return req.session.outletId === resourceOutletId;
}

function normalizeTin(tin: string): string {
  return tin.replace(/\D/g, "");
}

router.get("/purchases", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const requestedOutletId = req.query.outletId ? parseInt(req.query.outletId as string) : undefined;
    const outletId = resolveOutletId(req, requestedOutletId);
    if (!outletId) return res.status(400).json({ error: "outletId is required" });

    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const { start, end } = parseReportDateRange(dateFrom, dateTo, "month");

    const rows = await db
      .select()
      .from(purchaseInvoicesTable)
      .where(
        and(
          eq(purchaseInvoicesTable.outletId, outletId),
          gte(purchaseInvoicesTable.invoiceDate, start),
          lte(purchaseInvoicesTable.invoiceDate, end),
        ),
      )
      .orderBy(desc(purchaseInvoicesTable.invoiceDate));

    return res.json(
      rows.map((r) => ({
        id: r.id,
        outletId: r.outletId,
        supplierName: r.supplierName,
        supplierTin: r.supplierTin,
        invoiceNumber: r.invoiceNumber,
        invoiceDate: r.invoiceDate.toISOString().slice(0, 10),
        subtotal: parseFloat(r.subtotal),
        gstAmount: parseFloat(r.gstAmount),
        total: parseFloat(r.subtotal) + parseFloat(r.gstAmount),
        description: r.description,
        notes: r.notes,
      })),
    );
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid date range") {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/purchases", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const {
      outletId: bodyOutletId,
      supplierName,
      supplierTin,
      invoiceNumber,
      invoiceDate,
      subtotal,
      gstAmount,
      description,
      notes,
    } = req.body as {
      outletId: number;
      supplierName: string;
      supplierTin: string;
      invoiceNumber: string;
      invoiceDate: string;
      subtotal: number;
      gstAmount: number;
      description?: string;
      notes?: string;
    };

    const outletId = resolveOutletId(req, bodyOutletId);
    if (!outletId) return res.status(400).json({ error: "outletId is required" });
    if (!supplierName?.trim()) return res.status(400).json({ error: "supplierName is required" });
    if (!supplierTin?.trim()) return res.status(400).json({ error: "supplierTin is required" });
    if (!invoiceNumber?.trim()) return res.status(400).json({ error: "invoiceNumber is required" });
    if (!invoiceDate) return res.status(400).json({ error: "invoiceDate is required" });

    const tin = normalizeTin(supplierTin);
    if (tin.length !== 13) {
      return res.status(400).json({ error: "supplierTin must be 13 digits" });
    }

    const sub = Number(subtotal);
    const gst = Number(gstAmount);
    if (!Number.isFinite(sub) || sub < 0) return res.status(400).json({ error: "Invalid subtotal" });
    if (!Number.isFinite(gst) || gst < 0) return res.status(400).json({ error: "Invalid gstAmount" });

    const invDate = new Date(`${invoiceDate}T12:00:00.000Z`);
    if (Number.isNaN(invDate.getTime())) return res.status(400).json({ error: "Invalid invoiceDate" });

    const [row] = await db
      .insert(purchaseInvoicesTable)
      .values({
        outletId,
        supplierName: supplierName.trim(),
        supplierTin: tin,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invDate,
        subtotal: sub.toFixed(2),
        gstAmount: gst.toFixed(2),
        description: description?.trim() || null,
        notes: notes?.trim() || null,
        staffId: req.session.staffId ?? null,
      })
      .returning();

    return res.status(201).json({
      id: row.id,
      outletId: row.outletId,
      supplierName: row.supplierName,
      supplierTin: row.supplierTin,
      invoiceNumber: row.invoiceNumber,
      invoiceDate: row.invoiceDate.toISOString().slice(0, 10),
      subtotal: parseFloat(row.subtotal),
      gstAmount: parseFloat(row.gstAmount),
      total: parseFloat(row.subtotal) + parseFloat(row.gstAmount),
      description: row.description,
      notes: row.notes,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/purchases/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await db.query.purchaseInvoicesTable.findFirst({
      where: eq(purchaseInvoicesTable.id, id),
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) return res.status(403).json({ error: "Forbidden" });

    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (body.supplierName !== undefined) updates.supplierName = String(body.supplierName).trim();
    if (body.supplierTin !== undefined) {
      const tin = normalizeTin(String(body.supplierTin));
      if (tin.length !== 13) return res.status(400).json({ error: "supplierTin must be 13 digits" });
      updates.supplierTin = tin;
    }
    if (body.invoiceNumber !== undefined) updates.invoiceNumber = String(body.invoiceNumber).trim();
    if (body.invoiceDate !== undefined) {
      const invDate = new Date(`${body.invoiceDate}T12:00:00.000Z`);
      if (Number.isNaN(invDate.getTime())) return res.status(400).json({ error: "Invalid invoiceDate" });
      updates.invoiceDate = invDate;
    }
    if (body.subtotal !== undefined) updates.subtotal = Number(body.subtotal).toFixed(2);
    if (body.gstAmount !== undefined) updates.gstAmount = Number(body.gstAmount).toFixed(2);
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
    if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null;

    const [row] = await db.update(purchaseInvoicesTable).set(updates).where(eq(purchaseInvoicesTable.id, id)).returning();

    return res.json({
      id: row.id,
      outletId: row.outletId,
      supplierName: row.supplierName,
      supplierTin: row.supplierTin,
      invoiceNumber: row.invoiceNumber,
      invoiceDate: row.invoiceDate.toISOString().slice(0, 10),
      subtotal: parseFloat(row.subtotal),
      gstAmount: parseFloat(row.gstAmount),
      total: parseFloat(row.subtotal) + parseFloat(row.gstAmount),
      description: row.description,
      notes: row.notes,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/purchases/:id", requireRole("super_admin", "manager"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await db.query.purchaseInvoicesTable.findFirst({
      where: eq(purchaseInvoicesTable.id, id),
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!assertOutletAccess(req, existing.outletId)) return res.status(403).json({ error: "Forbidden" });
    await db.delete(purchaseInvoicesTable).where(eq(purchaseInvoicesTable.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
