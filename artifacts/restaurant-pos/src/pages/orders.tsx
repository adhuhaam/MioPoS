import { useState } from "react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "../lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  billed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function Orders() {
  const { auth } = useAuth();
  const outletId = auth!.outlet.id;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const params: any = { outletId };
  if (statusFilter !== "all") params.status = statusFilter;

  const { data, isLoading } = useListOrders(params, {
    query: { queryKey: getListOrdersQueryKey(params) }
  });

  const orders = (data as any)?.orders ?? [];
  const filtered = orders.filter((o: any) => {
    if (!search) return true;
    return (
      o.id.toString().includes(search) ||
      (o.tableName ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">Order history and status</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by order# or table..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-orders"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Table</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order: any, i: number) => (
                <tr key={order.id} data-testid={`row-order-${order.id}`} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-3 font-mono font-semibold">#{order.id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{order.tableName || `Table #${order.tableId}`}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[order.status] ?? ""}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{order.items?.length ?? 0}</td>
                  <td className="px-4 py-3 text-right font-semibold">${parseFloat(order.total || "0").toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleString()}</td>
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
