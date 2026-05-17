import { useState } from "react";
import { Link } from "wouter";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import type { Order, OrderDetail, OrderStatus, ServiceType } from "@workspace/api-client-react";
import { useAuth } from "../lib/auth";
import { canOperateOrders } from "../lib/roles";
import { printOrderReceipt } from "../lib/printReceipt";
import { buildOrderPayUrl, fetchOrderPayLink, fetchPayQrDataUrl } from "../lib/pay-url";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, Printer } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  billed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function Orders() {
  const { auth } = useAuth();
  const { fmt } = useCurrency();
  const { toast } = useToast();
  const outletId = auth!.outlet.id;
  const role = auth!.staff.role;
  const showActions = canOperateOrders(role);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ServiceType>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [printingId, setPrintingId] = useState<number | null>(null);

  const listParams: Record<string, unknown> = { outletId };
  if (statusFilter !== "all") listParams.status = statusFilter;
  if (typeFilter !== "all") listParams.serviceType = typeFilter;
  if (dateFrom) listParams.dateFrom = dateFrom;
  if (dateTo) listParams.dateTo = dateTo;

  const { data, isLoading } = useListOrders(listParams as Parameters<typeof useListOrders>[0], {
    query: { queryKey: getListOrdersQueryKey(listParams as Parameters<typeof useListOrders>[0]) }
  });

  const orders: Order[] = data?.orders ?? [];
  const filtered = orders.filter((o: Order) => {
    if (!search) return true;
    return (
      o.id.toString().includes(search) ||
      o.tableName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handlePrint = async (orderId: number) => {
    setPrintingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load order");
      const order = (await res.json()) as OrderDetail;
      let amountDue = Math.max(0, Number(order.total) - (order.payments ?? []).reduce((s, p) => s + Number(p.amount), 0));
      let payUrl: string | null = null;
      let payQrDataUrl: string | null = null;
      try {
        const link = await fetchOrderPayLink(orderId);
        if (link) {
          amountDue = link.amountDue;
          payUrl = buildOrderPayUrl(link.orderId, link.payToken);
          payQrDataUrl = await fetchPayQrDataUrl(payUrl);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("bank account")) {
          toast({ variant: "destructive", title: msg });
        }
      }
      const ok = await printOrderReceipt(order, {
        outletName: auth!.outlet.name,
        outletAddress: auth!.outlet.address,
        outletPhone: auth!.outlet.phone,
        staffName: auth!.staff.name,
        currency: auth!.outlet.currency,
        fmt,
        payUrl,
        amountDue,
        payQrDataUrl,
      });
      if (!ok) {
        toast({ variant: "destructive", title: "Allow pop-ups to print receipts" });
      }
    } catch {
      toast({ variant: "destructive", title: "Could not print receipt" });
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">View and update orders — open in POS to add items or take payment</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search order# or label..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-orders"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as "all" | OrderStatus)}>
          <SelectTrigger className="w-40" data-testid="select-order-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="billed">Billed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as "all" | ServiceType)}>
          <SelectTrigger className="w-36" data-testid="select-order-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="dine_in">Dine in</SelectItem>
            <SelectItem value="takeaway">Takeaway</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">From</label>
          <Input
            type="date"
            className="w-36"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            data-testid="input-date-from"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">To</label>
          <Input
            type="date"
            className="w-36"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            data-testid="input-date-to"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Date</th>
                {showActions && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order: Order, i: number) => (
                <tr key={order.id} data-testid={`row-order-${order.id}`} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-3 font-mono font-semibold">#{order.id}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground text-xs">{order.serviceType?.replace("_", " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{order.tableName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[order.status] ?? ""}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(order.total)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleString()}</td>
                  {showActions && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" asChild data-testid={`button-open-pos-${order.id}`}>
                          <Link href={`/pos?orderId=${order.id}`}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Open
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={printingId === order.id}
                          onClick={() => handlePrint(order.id)}
                          data-testid={`button-print-order-${order.id}`}
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          Print
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div className="p-8 text-center text-muted-foreground">No orders found</div>}
        </div>
      )}
    </div>
  );
}
