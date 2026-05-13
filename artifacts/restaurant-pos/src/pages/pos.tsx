import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListCategories, getListCategoriesQueryKey,
  useListMenuItems, getListMenuItemsQueryKey,
  useListTables, getListTablesQueryKey,
  useCreateOrder, useGetOrder, getGetOrderQueryKey,
  useAddOrderItem, useRemoveOrderItem, useUpdateOrder, useRecordPayment,
  listOrders, listItemModifierGroups, getListItemModifierGroupsQueryKey,
} from "@workspace/api-client-react";
import type { MenuItem, OrderDetail, OrderItem, ModifierGroup } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, X, Send, Receipt, CreditCard, Banknote, SplitSquareHorizontal } from "lucide-react";

type PayMode = "cash" | "card" | "split";

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
  const [payMode, setPayMode] = useState<PayMode>("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [paidLegs, setPaidLegs] = useState<{ method: "cash" | "card"; amount: number }[]>([]);

  // Modifier selection state
  const [modifierDialog, setModifierDialog] = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);
  const [itemModGroups, setItemModGroups] = useState<ModifierGroup[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);

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

  const typedOrder = order as OrderDetail | undefined;
  const items: OrderItem[] = typedOrder?.items ?? [];
  const subtotal = Number(typedOrder?.subtotal ?? 0);
  const tax = Number(typedOrder?.taxAmount ?? 0);
  const discount = Number(typedOrder?.discountAmount ?? 0);
  const total = Number(typedOrder?.total ?? 0);

  useEffect(() => {
    if (urlTableId && !activeOrderId) {
      findOrCreateOrder(urlTableId);
    }
  }, [urlTableId]);

  const findOrCreateOrder = async (tableId: number) => {
    setSelectedTableId(tableId);
    try {
      const res = await qc.fetchQuery({
        queryKey: ["/api/orders", { outletId, tableId, status: "open" }],
        queryFn: () => listOrders({ outletId, tableId, status: "open" as const }),
        staleTime: 0,
      });
      if (res.orders && res.orders.length > 0) {
        setActiveOrderId(res.orders[0].id);
        qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });
        return;
      }
    } catch {
      // fall through to create
    }
    createOrder.mutate(
      { data: { outletId, tableId, staffId: auth!.staff.id } },
      {
        onSuccess: (o: OrderDetail) => {
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

  const handleAddItem = async (item: MenuItem) => {
    if (!activeOrderId) return;
    let groups: ModifierGroup[] = [];
    try {
      const result = await qc.fetchQuery({
        queryKey: getListItemModifierGroupsQueryKey(item.id),
        queryFn: () => listItemModifierGroups(item.id),
        staleTime: 30000,
      });
      groups = (result ?? []) as ModifierGroup[];
    } catch {
      // no groups or fetch error — add directly
    }
    if (groups.length > 0) {
      setPendingItem(item);
      setItemModGroups(groups);
      setSelectedOptionIds([]);
      setModifierDialog(true);
    } else {
      doAddItem(item, []);
    }
  };

  const doAddItem = (item: MenuItem, optionIds: number[]) => {
    if (!activeOrderId) return;
    addItem.mutate(
      { id: activeOrderId, data: { menuItemId: item.id, quantity: 1, modifierOptionIds: optionIds } },
      {
        onSuccess: () => refetchOrder(),
        onError: () => toast({ variant: "destructive", title: "Failed to add item" }),
      }
    );
  };

  const handleConfirmModifiers = () => {
    if (!pendingItem) return;
    doAddItem(pendingItem, selectedOptionIds);
    setModifierDialog(false);
    setPendingItem(null);
    setSelectedOptionIds([]);
  };

  const toggleOptionId = (group: { multiSelect: boolean; options: Array<{ id: number }> }, optId: number) => {
    if (group.multiSelect) {
      setSelectedOptionIds(prev =>
        prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
      );
    } else {
      const groupOptIds = group.options.map(o => o.id);
      setSelectedOptionIds(prev => {
        const withoutGroup = prev.filter(id => !groupOptIds.includes(id));
        return prev.includes(optId) ? withoutGroup : [...withoutGroup, optId];
      });
    }
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
          setCashAmount(String(total.toFixed(2)));
          setCardAmount("");
          setPaidLegs([]);
          setPayMode("cash");
          setPayDialog(true);
        }
      }
    );
  };

  const totalPaidSoFar = paidLegs.reduce((s, l) => s + l.amount, 0);
  const remainingBalance = Math.max(0, total - totalPaidSoFar);

  const submitPaymentLeg = (method: "cash" | "card", amount: number) => {
    if (!activeOrderId || amount <= 0) return;
    recordPayment.mutate(
      { id: activeOrderId, data: { method, amount } },
      {
        onSuccess: () => {
          const newLegs = [...paidLegs, { method, amount }];
          const newTotal = newLegs.reduce((s, l) => s + l.amount, 0);
          setPaidLegs(newLegs);
          if (newTotal >= total) {
            toast({ title: "Payment complete. Order closed." });
            setPayDialog(false);
            setActiveOrderId(null);
            setSelectedTableId(null);
            setPaidLegs([]);
            qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });
          } else {
            toast({ title: `$${amount.toFixed(2)} recorded. Remaining: $${(total - newTotal).toFixed(2)}` });
            setCashAmount("");
            setCardAmount("");
          }
          refetchOrder();
        },
        onError: () => toast({ variant: "destructive", title: "Payment failed" }),
      }
    );
  };

  const handlePay = () => {
    if (payMode === "cash") {
      submitPaymentLeg("cash", parseFloat(cashAmount) || total);
    } else if (payMode === "card") {
      submitPaymentLeg("card", parseFloat(cardAmount) || total);
    } else {
      const cash = parseFloat(cashAmount) || 0;
      const card = parseFloat(cardAmount) || 0;
      if (cash > 0) submitPaymentLeg("cash", cash);
      if (card > 0) submitPaymentLeg("card", card);
    }
  };

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
          {items.map((item: OrderItem) => (
            <div key={item.id} data-testid={`order-item-${item.id}`} className="flex items-start gap-2 bg-muted/30 rounded-lg p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.menuItemName}</p>
                <p className="text-xs text-muted-foreground">${Number(item.unitPrice).toFixed(2)} × {item.quantity}</p>
                {item.modifiers && item.modifiers.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.modifiers.map(m => m.name).join(", ")}
                  </p>
                )}
              </div>
              <p className="text-sm font-semibold">${Number(item.total).toFixed(2)}</p>
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

      {/* Modifier selection dialog */}
      <Dialog open={modifierDialog} onOpenChange={open => { if (!open) { setModifierDialog(false); setPendingItem(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customise: {pendingItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-80 overflow-y-auto py-1">
            {itemModGroups.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No customisations available.</p>}
            {itemModGroups.map(group => (
              <div key={group.id}>
                <p className="text-sm font-semibold mb-1.5">
                  {group.name}
                  {group.required && <span className="ml-1 text-destructive text-xs">*</span>}
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    ({group.multiSelect ? "choose any" : "choose one"})
                  </span>
                </p>
                <div className="space-y-1">
                  {group.options.map(opt => {
                    const selected = selectedOptionIds.includes(opt.id);
                    return (
                      <button key={opt.id}
                        onClick={() => toggleOptionId(group, opt.id)}
                        className={`w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg border transition-colors ${selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"}`}
                        data-testid={`option-select-${opt.id}`}>
                        <span>{opt.name}</span>
                        {Number(opt.priceAdjustment) > 0 && (
                          <span className="text-xs text-muted-foreground">+${Number(opt.priceAdjustment).toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModifierDialog(false); setPendingItem(null); }}>Skip</Button>
            <Button onClick={handleConfirmModifiers} data-testid="button-confirm-modifiers">Add to Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <Label>Total Due</Label>
              <p className="text-2xl font-bold">${total.toFixed(2)}</p>
            </div>

            {paidLegs.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-sm">
                {paidLegs.map((leg, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span className="capitalize">{leg.method}</span>
                    <span>${leg.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-primary border-t border-border pt-1 mt-1">
                  <span>Remaining</span>
                  <span>${remainingBalance.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <Label>Payment Method</Label>
              <div className="flex gap-2 mt-1.5">
                {(["cash", "card", "split"] as PayMode[]).map(m => (
                  <button key={m} onClick={() => {
                    setPayMode(m);
                    if (m === "cash") { setCashAmount(remainingBalance.toFixed(2)); setCardAmount(""); }
                    else if (m === "card") { setCardAmount(remainingBalance.toFixed(2)); setCashAmount(""); }
                    else { setCashAmount(""); setCardAmount(""); }
                  }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${payMode === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"}`}
                    data-testid={`button-pay-mode-${m}`}>
                    {m === "cash" ? <Banknote className="w-4 h-4" /> : m === "card" ? <CreditCard className="w-4 h-4" /> : <SplitSquareHorizontal className="w-4 h-4" />}
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {payMode !== "card" && (
              <div>
                <Label>{payMode === "split" ? "Cash Amount" : "Amount"}</Label>
                <Input type="number" step="0.01" value={cashAmount} onChange={e => setCashAmount(e.target.value)} data-testid="input-cash-amount" placeholder={remainingBalance.toFixed(2)} />
              </div>
            )}
            {payMode !== "cash" && (
              <div>
                <Label>{payMode === "split" ? "Card Amount" : "Amount"}</Label>
                <Input type="number" step="0.01" value={cardAmount} onChange={e => setCardAmount(e.target.value)} data-testid="input-card-amount" placeholder={payMode === "card" ? remainingBalance.toFixed(2) : "0.00"} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancel</Button>
            <Button onClick={handlePay} disabled={recordPayment.isPending} data-testid="button-confirm-payment">
              <CreditCard className="w-4 h-4 mr-2" />Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
