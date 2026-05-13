import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListCategories, getListCategoriesQueryKey,
  useListMenuItems, getListMenuItemsQueryKey,
  useListTables, getListTablesQueryKey,
  useListOrders, getListOrdersQueryKey,
  useCreateOrder, useGetOrder, getGetOrderQueryKey,
  useAddOrderItem, useRemoveOrderItem, useUpdateOrder, useRecordPayment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, X, Plus, Minus, Send, Receipt, CreditCard } from "lucide-react";

export default function POS() {
  const { auth } = useAuth();
  const outletId = auth!.outlet.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search] = useLocation();
  const params = new URLSearchParams(search.includes("?") ? search.split("?")[1] : "");
  const urlTableId = params.get("tableId") ? parseInt(params.get("tableId")!) : null;

  const [selectedTableId, setSelectedTableId] = useState<number | null>(urlTableId);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [activeCatId, setActiveCatId] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState("");
  const [payDialog, setPayDialog] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "split">("cash");
  const [payAmount, setPayAmount] = useState("");

  const { data: categories } = useListCategories({ outletId }, { query: { queryKey: getListCategoriesQueryKey({ outletId }) } });
  const { data: menuItems } = useListMenuItems({ outletId }, { query: { queryKey: getListMenuItemsQueryKey({ outletId }) } });
  const { data: tables } = useListTables({ outletId }, { query: { queryKey: getListTablesQueryKey({ outletId }) } });

  const curCatId = activeCatId ?? categories?.[0]?.id;
  const catItems = menuItems?.filter(i => i.categoryId === curCatId && i.available) ?? [];

  const createOrder = useCreateOrder();
  const addItem = useAddOrderItem();
  const removeItem = useRemoveOrderItem();
  const updateOrder = useUpdateOrder();
  const recordPayment = useRecordPayment();

  const { data: order, refetch: refetchOrder } = useGetOrder(
    activeOrderId!,
    { query: { enabled: !!activeOrderId, queryKey: getGetOrderQueryKey(activeOrderId!) } }
  );

  useEffect(() => {
    if (urlTableId && !activeOrderId) {
      findOrCreateOrder(urlTableId);
    }
  }, [urlTableId]);

  const findOrCreateOrder = async (tableId: number) => {
    setSelectedTableId(tableId);
    createOrder.mutate(
      { data: { outletId, tableId, staffId: auth!.staff.id } },
      {
        onSuccess: (o: any) => {
          setActiveOrderId(o.id);
          qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });
        },
        onError: () => toast({ variant: "destructive", title: "Could not create order" }),
      }
    );
  };

  const handleTableSelect = (tableId: string) => {
    findOrCreateOrder(parseInt(tableId));
  };

  const handleAddItem = (item: any) => {
    if (!activeOrderId) return;
    addItem.mutate(
      { id: activeOrderId, data: { menuItemId: item.id, quantity: 1 } },
      {
        onSuccess: () => { refetchOrder(); },
        onError: () => toast({ variant: "destructive", title: "Failed to add item" }),
      }
    );
  };

  const handleRemoveItem = (itemId: number) => {
    if (!activeOrderId) return;
    removeItem.mutate(
      { id: activeOrderId, itemId },
      { onSuccess: () => refetchOrder() }
    );
  };

  const handleSendToKitchen = () => {
    toast({ title: "Order sent to kitchen" });
  };

  const handleApplyDiscount = () => {
    if (!activeOrderId) return;
    const dp = parseFloat(discountPercent) || 0;
    updateOrder.mutate(
      { id: activeOrderId, data: { discountPercent: dp } },
      { onSuccess: () => refetchOrder() }
    );
  };

  const handleGenerateBill = () => {
    if (!activeOrderId) return;
    updateOrder.mutate(
      { id: activeOrderId, data: { status: "billed" } },
      {
        onSuccess: () => {
          refetchOrder();
          qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });
          setPayAmount(order?.total?.toString() ?? "");
          setPayDialog(true);
        }
      }
    );
  };

  const handlePay = () => {
    if (!activeOrderId) return;
    recordPayment.mutate(
      { id: activeOrderId, data: { method: payMethod, amount: parseFloat(payAmount) } },
      {
        onSuccess: () => {
          toast({ title: "Payment recorded. Order closed." });
          setPayDialog(false);
          setActiveOrderId(null);
          setSelectedTableId(null);
          qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });
        },
        onError: () => toast({ variant: "destructive", title: "Payment failed" }),
      }
    );
  };

  const items = (order as any)?.items ?? [];
  const subtotal = parseFloat((order as any)?.subtotal ?? "0");
  const tax = parseFloat((order as any)?.taxAmount ?? "0");
  const discount = parseFloat((order as any)?.discountAmount ?? "0");
  const total = parseFloat((order as any)?.total ?? "0");

  const availTables = tables?.filter(t => t.status === "available") ?? [];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedTableId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
            <ShoppingCart className="w-16 h-16 text-muted-foreground/30" />
            <div className="text-center">
              <h2 className="text-xl font-semibold">Select a Table</h2>
              <p className="text-muted-foreground text-sm mt-1">Choose a table to start a new order</p>
            </div>
            <div className="w-full max-w-xs">
              <Select onValueChange={handleTableSelect}>
                <SelectTrigger data-testid="select-table"><SelectValue placeholder="Select table..." /></SelectTrigger>
                <SelectContent>
                  {availTables.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()} data-testid={`option-table-${t.id}`}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-4 py-3 flex gap-2 overflow-x-auto">
              {categories?.map(cat => (
                <button key={cat.id} data-testid={`button-category-${cat.id}`}
                  onClick={() => setActiveCatId(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${curCatId === cat.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70 text-muted-foreground"}`}>
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {catItems.map(item => (
                  <button key={item.id} data-testid={`button-menu-item-${item.id}`}
                    onClick={() => handleAddItem(item)}
                    className="border border-border rounded-xl p-4 text-left hover:border-primary hover:bg-primary/5 transition-all active:scale-95 bg-card">
                    <p className="font-semibold text-sm leading-tight">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-1 truncate">{item.description}</p>}
                    <p className="font-bold text-primary mt-2">${Number(item.price).toFixed(2)}</p>
                  </button>
                ))}
                {!catItems.length && <div className="col-span-4 text-center text-muted-foreground py-8 text-sm">No items in this category</div>}
              </div>
            </div>
          </>
        )}
      </div>

      <aside className="w-80 border-l border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Current Order</h2>
            {selectedTableId && (
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                {tables?.find(t => t.id === selectedTableId)?.name ?? "Table"}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2">
          {items.map((item: any) => (
            <div key={item.id} data-testid={`order-item-${item.id}`} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.menuItemName}</p>
                <p className="text-xs text-muted-foreground">${parseFloat(item.unitPrice).toFixed(2)} × {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold">${parseFloat(item.total).toFixed(2)}</p>
              <button onClick={() => handleRemoveItem(item.id)} data-testid={`button-remove-item-${item.id}`} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {!items.length && <div className="text-center text-muted-foreground text-sm py-8">No items yet</div>}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Discount %"
              value={discountPercent}
              onChange={e => setDiscountPercent(e.target.value)}
              className="text-sm h-8"
              data-testid="input-discount"
            />
            <Button size="sm" variant="outline" onClick={handleApplyDiscount} className="h-8" data-testid="button-apply-discount">Apply</Button>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-border"><span>Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleSendToKitchen} disabled={!activeOrderId || !items.length} className="text-sm" data-testid="button-send-kitchen">
              <Send className="w-3.5 h-3.5 mr-1" />Kitchen
            </Button>
            <Button onClick={handleGenerateBill} disabled={!activeOrderId || !items.length || updateOrder.isPending} className="text-sm" data-testid="button-generate-bill">
              <Receipt className="w-3.5 h-3.5 mr-1" />Bill
            </Button>
          </div>
        </div>
      </aside>

      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Total Due</Label>
              <p className="text-2xl font-bold">${total.toFixed(2)}</p>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={v => setPayMethod(v as any)}>
                <SelectTrigger data-testid="select-pay-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} data-testid="input-pay-amount" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancel</Button>
            <Button onClick={handlePay} disabled={recordPayment.isPending} data-testid="button-confirm-payment">
              <CreditCard className="w-4 h-4 mr-2" />Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
