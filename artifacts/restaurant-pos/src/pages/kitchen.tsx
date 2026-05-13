import { useListKitchenOrders, getListKitchenOrdersQueryKey, useUpdateOrderItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Clock, ChefHat } from "lucide-react";

const KITCHEN_STATUS_ORDER = ["pending", "preparing", "ready", "served"];
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
  preparing: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200",
  ready: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200",
  served: "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
};

function timeAgo(date: string | Date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Kitchen() {
  const { auth } = useAuth();
  const outletId = auth!.outlet.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: orders, isLoading } = useListKitchenOrders(
    { outletId },
    { query: { queryKey: getListKitchenOrdersQueryKey({ outletId }), refetchInterval: 10000 } }
  );

  const updateItem = useUpdateOrderItem();

  const advanceStatus = (orderId: number, itemId: number, current: string) => {
    const next = KITCHEN_STATUS_ORDER[KITCHEN_STATUS_ORDER.indexOf(current) + 1];
    if (!next) return;
    updateItem.mutate(
      { id: orderId, itemId, data: { kitchenStatus: next as any } },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: getListKitchenOrdersQueryKey({ outletId }) }),
        onError: () => toast({ variant: "destructive", title: "Failed to update status" }),
      }
    );
  };

  return (
    <div className="p-6 space-y-6 min-h-full bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-7 h-7" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kitchen Display</h1>
            <p className="text-muted-foreground text-sm">Auto-refreshes every 10 seconds</p>
          </div>
        </div>
        <div data-testid="status-order-count" className="text-sm text-muted-foreground">{orders?.length ?? 0} active orders</div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading kitchen orders...</div>
      ) : !orders?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ChefHat className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">All clear</p>
          <p className="text-sm">No pending kitchen orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order: any) => (
            <div key={order.id} data-testid={`card-kitchen-order-${order.id}`} className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-b border-border">
                <div>
                  <p className="font-bold text-base">{order.tableName || `Table #${order.tableId}`}</p>
                  <p className="text-xs text-muted-foreground">Order #{order.id}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {timeAgo(order.createdAt)}
                </div>
              </div>
              <div className="p-3 space-y-2">
                {order.items.map((item: any) => (
                  <button
                    key={item.id}
                    data-testid={`button-kitchen-item-${item.id}`}
                    onClick={() => advanceStatus(order.id, item.id, item.kitchenStatus)}
                    disabled={item.kitchenStatus === "served"}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${STATUS_STYLE[item.kitchenStatus]}`}
                  >
                    <span className="flex-1 text-left">
                      <span className="font-semibold">{item.quantity}×</span> {item.menuItemName}
                      {item.notes && <span className="block text-xs opacity-70 font-normal mt-0.5">{item.notes}</span>}
                    </span>
                    <span className="ml-3 text-xs capitalize px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                      {item.kitchenStatus}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
