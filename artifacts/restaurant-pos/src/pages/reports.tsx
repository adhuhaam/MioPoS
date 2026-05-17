import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListOutlets } from "@workspace/api-client-react";
import { useAuth } from "../lib/auth";
import { useCurrency } from "@/hooks/useCurrency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, Plus, Receipt, ShoppingCart, Trash2 } from "lucide-react";
import { downloadInputTaxExcel, downloadOutputTaxExcel, type InputTaxLine, type OutputTaxLine } from "@/lib/tax-export";
import { useToast } from "@/hooks/use-toast";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

type TaxSummary = {
  outletId: number;
  outletName: string;
  businessTin: string | null;
  taxRate: number;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  output: {
    orderCount: number;
    taxableSales: number;
    gstCollected: number;
    timeFees: number;
    grossSales: number;
  };
  input: {
    invoiceCount: number;
    taxablePurchases: number;
    gstPaid: number;
    grossPurchases: number;
  };
  mira205: {
    box3TotalSales: number;
    outputGst: number;
    inputGst: number;
    netGstPayable: number;
  };
};

type OutputReport = {
  outletName: string;
  periodLabel: string;
  taxRate: number;
  lines: OutputTaxLine[];
  totals: { count: number; taxableAmount: number; gstAmount: number; totalAmount: number };
};

type InputReport = {
  periodLabel: string;
  lines: InputTaxLine[];
  totals: { count: number; subtotal: number; gstAmount: number; total: number };
};

type PurchaseRow = InputTaxLine & { id: number };

function monthStartISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function lastMonthRange(): { from: string; to: string } {
  const d = new Date();
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

type Tab = "summary" | "sales" | "supply";

export default function Reports() {
  const { auth } = useAuth();
  const { fmt } = useCurrency();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSuperAdmin = auth?.staff.role === "super_admin";
  const [tab, setTab] = useState<Tab>("summary");
  const [dateFrom, setDateFrom] = useState(monthStartISO);
  const [dateTo, setDateTo] = useState(todayISO);
  const [outletId, setOutletId] = useState<number | null>(isSuperAdmin ? null : auth!.outlet.id);

  const { data: outlets } = useListOutlets();
  const oid = outletId ?? auth?.outlet.id;
  const rangeKey = ["tax", oid, dateFrom, dateTo];

  const { data: summary, isLoading: loadingSummary, isError: summaryError, error: summaryErrorDetail } = useQuery({
    queryKey: [...rangeKey, "summary"],
    queryFn: () =>
      apiFetch<TaxSummary>(
        `/api/reports/tax/summary?outletId=${oid}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      ),
    enabled: !!oid,
  });

  const {
    data: outputReport,
    isLoading: loadingOutput,
    isError: outputError,
    error: outputErrorDetail,
    refetch: refetchOutput,
  } = useQuery({
    queryKey: [...rangeKey, "output"],
    queryFn: () =>
      apiFetch<OutputReport>(
        `/api/reports/tax/output?outletId=${oid}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      ),
    enabled: !!oid && tab === "sales",
    retry: 1,
  });

  const { data: inputReport, isLoading: loadingInput } = useQuery({
    queryKey: [...rangeKey, "input"],
    queryFn: () =>
      apiFetch<InputReport>(
        `/api/reports/tax/input?outletId=${oid}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      ),
    enabled: !!oid && (tab === "supply" || tab === "summary"),
  });

  const { data: purchases = [], refetch: refetchPurchases } = useQuery({
    queryKey: [...rangeKey, "purchases"],
    queryFn: () =>
      apiFetch<PurchaseRow[]>(
        `/api/purchases?outletId=${oid}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
      ),
    enabled: !!oid && tab === "supply",
  });

  const [purchaseForm, setPurchaseForm] = useState({
    supplierName: "",
    supplierTin: "",
    invoiceNumber: "",
    invoiceDate: todayISO(),
    subtotal: "",
    gstAmount: "",
    description: "",
  });
  const [savingPurchase, setSavingPurchase] = useState(false);

  const gstFromSubtotal = useMemo(() => {
    const sub = parseFloat(purchaseForm.subtotal);
    const rate = summary?.taxRate ?? 8;
    if (!Number.isFinite(sub) || sub <= 0) return "";
    return (sub * (rate / 100)).toFixed(2);
  }, [purchaseForm.subtotal, summary?.taxRate]);

  const applyGst8 = () => {
    if (gstFromSubtotal) setPurchaseForm((f) => ({ ...f, gstAmount: gstFromSubtotal }));
  };

  const savePurchase = async () => {
    if (!oid) return;
    setSavingPurchase(true);
    try {
      await apiFetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: oid,
          supplierName: purchaseForm.supplierName,
          supplierTin: purchaseForm.supplierTin,
          invoiceNumber: purchaseForm.invoiceNumber,
          invoiceDate: purchaseForm.invoiceDate,
          subtotal: parseFloat(purchaseForm.subtotal),
          gstAmount: parseFloat(purchaseForm.gstAmount),
          description: purchaseForm.description || undefined,
        }),
      });
      toast({ title: "Purchase invoice recorded" });
      setPurchaseForm({
        supplierName: "",
        supplierTin: "",
        invoiceNumber: "",
        invoiceDate: todayISO(),
        subtotal: "",
        gstAmount: "",
        description: "",
      });
      qc.invalidateQueries({ queryKey: rangeKey });
      refetchPurchases();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingPurchase(false);
    }
  };

  const deletePurchase = async (id: number) => {
    if (!confirm("Delete this purchase invoice?")) return;
    try {
      await apiFetch(`/api/purchases/${id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: rangeKey });
      refetchPurchases();
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const outletName = summary?.outletName ?? outlets?.find((o) => o.id === oid)?.name ?? "";

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax &amp; Reports</h1>
          <p className="text-muted-foreground mt-1">
            MIRA GST — Output Tax (sales), Input Tax (supplies), and MIRA 205 summary
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="input-date-from" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="input-date-to" />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(monthStartISO()); setDateTo(todayISO()); }}>
            This month
          </Button>
          <Button variant="outline" size="sm" onClick={() => { const r = lastMonthRange(); setDateFrom(r.from); setDateTo(r.to); }}>
            Last month
          </Button>
        </div>
      </div>

      {isSuperAdmin && (
        <Select value={outletId?.toString() ?? ""} onValueChange={(v) => setOutletId(parseInt(v))}>
          <SelectTrigger className="w-72" data-testid="select-outlet-report">
            <SelectValue placeholder="Select outlet…" />
          </SelectTrigger>
          <SelectContent>
            {outlets?.map((o) => (
              <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex border-b border-border gap-1 flex-wrap">
        {(
          [
            { id: "summary" as const, label: "MIRA 205 Summary", icon: FileSpreadsheet },
            { id: "sales" as const, label: "Sales (Output Tax)", icon: Receipt },
            { id: "supply" as const, label: "Supply (Input Tax)", icon: ShoppingCart },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-testid={`tab-${id}`}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition-colors ${
              tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {!oid && <p className="text-muted-foreground">Select an outlet to view reports.</p>}

      {tab === "summary" && oid && (
        <div className="space-y-6">
          {summaryError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
              <p className="font-medium text-destructive">Could not load tax summary</p>
              <p className="text-muted-foreground mt-1">{(summaryErrorDetail as Error).message}</p>
            </div>
          ) : loadingSummary ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : summary ? (
            <>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
                <strong className="text-foreground">MIRA filing reminder:</strong> Upload Excel files with sheet names
                &quot;Input Tax Statement&quot; and &quot;Output Tax Statement&quot; unchanged. Submit MIRA 205 by the 28th.
                {summary.businessTin ? ` Your TIN: ${summary.businessTin}.` : " Set your 13-digit business TIN in Settings."}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label="Taxable sales (excl. GST)" value={fmt(summary.output.taxableSales)} />
                <SummaryCard label="GST collected (output)" value={fmt(summary.output.gstCollected)} highlight />
                <SummaryCard label="GST paid on purchases (input)" value={fmt(summary.input.gstPaid)} />
                <SummaryCard
                  label="Net GST payable"
                  value={fmt(summary.mira205.netGstPayable)}
                  highlight={summary.mira205.netGstPayable > 0}
                />
              </div>

              <div className="border border-border rounded-xl p-5 bg-card space-y-3">
                <h3 className="font-semibold">MIRA 205 — key figures ({summary.periodLabel})</h3>
                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  <Row label="Box 3 — Total sales value (approx.)" value={fmt(summary.mira205.box3TotalSales)} />
                  <Row label="Output GST (from receipts)" value={fmt(summary.mira205.outputGst)} />
                  <Row label="Input GST (from supplier invoices)" value={fmt(summary.mira205.inputGst)} />
                  <Row label="Paid orders in period" value={String(summary.output.orderCount)} />
                  <Row label="Purchase invoices in period" value={String(summary.input.invoiceCount)} />
                  <Row label="GST rate configured" value={`${summary.taxRate}%`} />
                </dl>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={!outputReport && loadingOutput}
                  onClick={async () => {
                    const data =
                      outputReport ??
                      (await apiFetch<OutputReport>(
                        `/api/reports/tax/output?outletId=${oid}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
                      ));
                    downloadOutputTaxExcel({
                      outletName,
                      periodLabel: `${dateFrom} – ${dateTo}`,
                      lines: data.lines,
                      totals: data.totals,
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Output Tax (.xlsx)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const lines = inputReport?.lines ?? [];
                    downloadInputTaxExcel({
                      outletName,
                      periodLabel: `${dateFrom} – ${dateTo}`,
                      lines,
                      totals: inputReport?.totals ?? {
                        subtotal: lines.reduce((s, l) => s + l.subtotal, 0),
                        gstAmount: lines.reduce((s, l) => s + l.gstAmount, 0),
                        total: lines.reduce((s, l) => s + l.total, 0),
                      },
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Input Tax (.xlsx)
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === "sales" && oid && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              Every paid receipt in the period — for MIRA Output Tax Statement (required if annual sales exceed MVR 5M).
            </p>
            <Button
              disabled={!outputReport?.lines.length}
              onClick={() =>
                outputReport &&
                downloadOutputTaxExcel({
                  outletName,
                  periodLabel: outputReport.periodLabel,
                  lines: outputReport.lines,
                  totals: outputReport.totals,
                })
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Download Output Tax Excel
            </Button>
          </div>
          {outputError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm space-y-2">
              <p className="font-medium text-destructive">Could not load sales report</p>
              <p className="text-muted-foreground">{(outputErrorDetail as Error).message}</p>
              <p className="text-muted-foreground">
                If you recently updated the app, restart the API: stop dev-local (Ctrl+C), then run{" "}
                <code className="text-xs bg-muted px-1 rounded">bash scripts/dev-local.sh</code>
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchOutput()}>Retry</Button>
            </div>
          ) : loadingOutput ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <TaxTable
              headers={[
                "Receipt",
                "Date",
                "Type",
                "Customer",
                "Excl. GST",
                "GST",
                "Total",
                "Pay",
              ]}
              rows={(outputReport?.lines ?? []).map((l) => [
                l.invoiceNumber,
                l.invoiceDate,
                l.serviceType,
                l.customerName ?? "—",
                fmt(l.taxableAmount),
                fmt(l.gstAmount),
                fmt(l.totalAmount),
                l.paymentMethods.join(", ") || "—",
              ])}
              footer={
                outputReport
                  ? [
                      "TOTAL",
                      "",
                      "",
                      "",
                      fmt(outputReport.totals.taxableAmount),
                      fmt(outputReport.totals.gstAmount),
                      fmt(outputReport.totals.totalAmount),
                      `${outputReport.totals.count} receipts`,
                    ]
                  : undefined
              }
            />
          )}
        </div>
      )}

      {tab === "supply" && oid && (
        <div className="space-y-8">
          <div className="border border-border rounded-xl p-5 bg-card space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Record supplier invoice (Input Tax)
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Supplier name</Label>
                <Input
                  value={purchaseForm.supplierName}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, supplierName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Supplier TIN (13 digits)</Label>
                <Input
                  value={purchaseForm.supplierTin}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, supplierTin: e.target.value.replace(/\D/g, "").slice(0, 13) }))}
                  placeholder="0000000000000"
                />
              </div>
              <div>
                <Label>Invoice number</Label>
                <Input
                  value={purchaseForm.invoiceNumber}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label>Invoice date</Label>
                <Input
                  type="date"
                  value={purchaseForm.invoiceDate}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, invoiceDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Bill subtotal (excl. GST)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={purchaseForm.subtotal}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, subtotal: e.target.value }))}
                />
              </div>
              <div>
                <Label>GST paid</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={purchaseForm.gstAmount}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, gstAmount: e.target.value }))}
                  />
                  <Button type="button" variant="secondary" onClick={applyGst8} title={`Apply ${summary?.taxRate ?? 8}%`}>
                    {summary?.taxRate ?? 8}%
                  </Button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Description (optional)</Label>
                <Input
                  value={purchaseForm.description}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={savePurchase} disabled={savingPurchase}>
              {savingPurchase ? "Saving…" : "Add purchase invoice"}
            </Button>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              Supplier invoices for MIRA Input Tax Statement — upload to MIRAconnect with MIRA 205.
            </p>
            <Button
              disabled={!purchases.length}
              onClick={() =>
                downloadInputTaxExcel({
                  outletName,
                  periodLabel: `${dateFrom} – ${dateTo}`,
                  lines: purchases.map((p, i) => ({ ...p, lineNo: i + 1 })),
                  totals: {
                    subtotal: purchases.reduce((s, p) => s + p.subtotal, 0),
                    gstAmount: purchases.reduce((s, p) => s + p.gstAmount, 0),
                    total: purchases.reduce((s, p) => s + p.total, 0),
                  },
                })
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Download Input Tax Excel
            </Button>
          </div>

          {loadingInput ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <TaxTable
              headers={["Supplier", "TIN", "Date", "Invoice #", "Subtotal", "GST", "Total"]}
              rows={purchases.map((p) => [
                p.supplierName,
                p.supplierTin,
                p.invoiceDate,
                p.invoiceNumber,
                fmt(p.subtotal),
                fmt(p.gstAmount),
                fmt(p.total),
              ])}
              actions={purchases.map((p) => (
                <Button key={p.id} variant="ghost" size="icon" onClick={() => deletePurchase(p.id)} aria-label="Delete">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              ))}
              footer={
                purchases.length
                  ? [
                      "TOTAL",
                      "",
                      "",
                      "",
                      fmt(purchases.reduce((s, p) => s + p.subtotal, 0)),
                      fmt(purchases.reduce((s, p) => s + p.gstAmount, 0)),
                      fmt(purchases.reduce((s, p) => s + p.total, 0)),
                    ]
                  : undefined
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border rounded-xl p-5 bg-card ${highlight ? "border-primary/50" : "border-border"}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

function TaxTable({
  headers,
  rows,
  footer,
  actions,
}: {
  headers: string[];
  rows: string[][];
  footer?: string[];
  actions?: React.ReactNode[];
}) {
  return (
    <div className="border border-border rounded-xl overflow-x-auto bg-card">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((h, i) => (
              <th key={`${h}-${i}`} className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
            {actions && <th className="w-12" aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-muted-foreground">
                No records in this date range
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2.5 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-2.5 w-12">{actions[i]}</td>
                )}
              </tr>
            ))
          )}
        </tbody>
        {footer && (
          <tfoot className="bg-muted/30 font-semibold">
            <tr>
              {footer.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
