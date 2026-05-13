import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useListCategories, getListCategoriesQueryKey,
  useListMenuItems, getListMenuItemsQueryKey,
  useListTables, getListTablesQueryKey,
  useCreateOrder, useGetOrder, getGetOrderQueryKey,
  useAddOrderItem, useRemoveOrderItem, useUpdateOrder, useRecordPayment,
  useListCustomers,
  listOrders, listItemModifierGroups, getListItemModifierGroupsQueryKey,
} from "@workspace/api-client-react";
import type { MenuItem, OrderDetail, OrderItem, ModifierGroup, Customer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, X, Send, Receipt, Banknote, Building2, CreditCard, Upload, CheckCircle2, Timer } from "lucide-react";

type PayMode = "cash" | "bank_transfer" | "credit";

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
  const [orderNote, setOrderNote] = useState("");
  const [payDialog, setPayDialog] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>("cash");
  const [payAmount, setPayAmount] = useState("");
  const [paidLegs, setPaidLegs] = useState<{ method: PayMode; amount: number; label?: string }[]>([]);

  // Bank transfer slip upload state
  const [slipImagePath, setSlipImagePath] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string | null>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);

  // Credit / customer state
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modifier selection state
  const [modifierDialog, setModifierDialog] = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);
  const [itemModGroups, setItemModGroups] = useState<ModifierGroup[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);

  const { data: categories } = useListCategories({ outletId }, { query: { queryKey: getListCategoriesQueryKey({ outletId }) } });
  const { data: menuItems } = useListMenuItems({ outletId }, { query: { queryKey: getListMenuItemsQueryKey({ outletId }) } });
  const { data: tables } = useListTables({ outletId }, { query: { queryKey: getListTablesQueryKey({ outletId }) } });
  const { data: customers = [] } = useListCustomers(
    { outletId, search: customerSearch || undefined },
    { query: { enabled: payMode === "credit" } }
  );

  const curCatId = activeCatId ?? categories?.[0]?.id;
  const catItems = menuItems?.filter(i => i.categoryId === curCatId && i.available) ?? [];

  const createOrder = useCreateOrder();
  const addItem = useAddOrderItem();
  const removeItem = useRemoveOrderItem();
  const updateOrder = useUpdateOrder();
  const recordPayment = useRecordPayment();

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (result) => {
      setSlipImagePath(result.objectPath);
      toast({ title: "Slip uploaded" });
    },
    onError: () => toast({ variant: "destructive", title: "Slip upload failed" }),
  });

  const { data: order, refetch: refetchOrder } = useGetOrder(
    activeOrderId!,
    { query: { enabled: !!activeOrderId, queryKey: getGetOrderQueryKey(activeOrderId!) } }
  );

  const typedOrder = order as OrderDetail | undefined;
  const items: OrderItem[] = typedOrder?.items ?? [];
  const subtotal = Number(typedOrder?.subtotal ?? 0);
  const discount = Number(typedOrder?.discountAmount ?? 0);
  const tax = Number(typedOrder?.taxAmount ?? 0);
  const timeFee = Number((typedOrder as any)?.timeFee ?? 0);
  const total = Number(typedOrder?.total ?? 0);

  // Live timer for timed-area tables
  const selectedTable = tables?.find(t => t.id === selectedTableId) as any;
  const isTimedArea = selectedTable?.area?.type === "timed";
  const [elapsedMins, setElapsedMins] = useState(0);
  useEffect(() => {
    if (!isTimedArea || !(typedOrder as any)?.tableOpenedAt) { setElapsedMins(0); return; }
    const update = () => {
      const ms = Date.now() - new Date((typedOrder as any).tableOpenedAt).getTime();
      setElapsedMins(Math.floor(ms / 60000));
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [isTimedArea, (typedOrder as any)?.tableOpenedAt]);

  // Auto-select first table from URL param
  useEffect(() => {
    if (urlTableId && !activeOrderId) handleTableSelect(urlTableId.toString());
  }, [urlTableId]);

  // Sync order note from loaded order
  useEffect(() => {
    setOrderNote(typedOrder?.notes ?? "");
  }, [typedOrder?.id]);

  const handleTableSelect = async (tableIdStr: string) => {
    const tableId = parseInt(tableIdStr);
    setSelectedTableId(tableId);

    // Find existing open order for this table
    try {
      const existing = await listOrders({ outletId, tableId, status: "open" });
      const open = Array.isArray(existing) ? existing[0] : (existing as { data?: unknown[] })?.data?.[0];
      if (open && typeof open === "object" && "id" in open) {
        setActiveOrderId((open as { id: number }).id);
      } else {
        const newOrder = await createOrder.mutateAsync({ data: { outletId, tableId, staffId: auth!.staff.id } });
        setActiveOrderId((newOrder as { id: number }).id);
        qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to open order" });
    }
  };

  const handleAddItem = async (item: MenuItem) => {
    if (!activeOrderId) return;
    try {
      const groups: ModifierGroup[] = await listItemModifierGroups(item.id);
      if (groups.length > 0) {
        setPendingItem(item);
        setItemModGroups(groups);
        setSelectedOptionIds([]);
        setModifierDialog(true);
      } else {
        await addItem.mutateAsync({ id: activeOrderId, data: { menuItemId: item.id, quantity: 1 } });
        refetchOrder();
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to add item" });
    }
  };

  const toggleOptionId = (group: ModifierGroup, optionId: number) => {
    if (group.multiSelect) {
      setSelectedOptionIds(prev => prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]);
    } else {
      const groupOptIds = group.options.map(o => o.id);
      setSelectedOptionIds(prev => [...prev.filter(id => !groupOptIds.includes(id)), optionId]);
    }
  };

  const handleConfirmModifiers = async () => {
    if (!activeOrderId || !pendingItem) return;
    try {
      await addItem.mutateAsync({ id: activeOrderId, data: { menuItemId: pendingItem.id, quantity: 1, modifierOptionIds: selectedOptionIds } });
      refetchOrder();
      setModifierDialog(false);
      setPendingItem(null);
    } catch {
      toast({ variant: "destructive", title: "Failed to add item" });
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!activeOrderId) return;
    await removeItem.mutateAsync({ id: activeOrderId, itemId });
    refetchOrder();
  };

  const handleSendToKitchen = async () => {
    if (!activeOrderId) return;
    await updateOrder.mutateAsync({ id: activeOrderId, data: { status: "open" } });
    refetchOrder();
    toast({ title: "Sent to kitchen" });
  };

  const handleGenerateBill = () => {
    if (!activeOrderId) return;
    updateOrder.mutate(
      { id: activeOrderId, data: { status: "billed" } },
      {
        onSuccess: () => {
          refetchOrder();
          qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });
          setPayAmount(total.toFixed(2));
          setPayMode("cash");
          setPaidLegs([]);
          setSlipImagePath(null);
          setSlipFileName(null);
          setSelectedCustomer(null);
          setCustomerSearch("");
          setPayDialog(true);
        }
      }
    );
  };

  const totalPaidSoFar = paidLegs.reduce((s, l) => s + l.amount, 0);
  const remainingBalance = Math.max(0, total - totalPaidSoFar);

  const submitPaymentLeg = () => {
    if (!activeOrderId) return;
    const amount = parseFloat(payAmount) || remainingBalance;
    if (amount <= 0) return;

    if (payMode === "bank_transfer" && !slipImagePath) {
      toast({ variant: "destructive", title: "Please upload the transfer slip first" });
      return;
    }
    if (payMode === "credit" && !selectedCustomer) {
      toast({ variant: "destructive", title: "Please select a customer" });
      return;
    }
    if (payMode === "credit" && selectedCustomer && Number(selectedCustomer.creditBalance) < amount) {
      toast({ variant: "destructive", title: `Insufficient credit (balance: $${Number(selectedCustomer.creditBalance).toFixed(2)})` });
      return;
    }

    const payload: { method: PayMode; amount: number; customerId?: number; slipImagePath?: string } = {
      method: payMode,
      amount,
    };
    if (payMode === "credit" && selectedCustomer) payload.customerId = selectedCustomer.id;
    if (payMode === "bank_transfer" && slipImagePath) payload.slipImagePath = slipImagePath;

    recordPayment.mutate(
      { id: activeOrderId, data: payload as Parameters<typeof recordPayment.mutate>[0]["data"] },
      {
        onSuccess: () => {
          const label = payMode === "credit" ? `Credit (${selectedCustomer?.name})` : payMode === "bank_transfer" ? "Bank Transfer" : "Cash";
          const newLegs = [...paidLegs, { method: payMode, amount, label }];
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
            setPayAmount(String((total - newTotal).toFixed(2)));
            setSlipImagePath(null);
            setSlipFileName(null);
            setSelectedCustomer(null);
          }
          refetchOrder();
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Payment failed";
          toast({ variant: "destructive", title: msg });
        },
      }
    );
  };

  const availTables = tables?.filter(t => t.status === "available") ?? [];

  const switchPayMode = (m: PayMode) => {
    setPayMode(m);
    setPayAmount(remainingBalance.toFixed(2));
    setSlipImagePath(null);
    setSlipFileName(null);
    setSelectedCustomer(null);
    setCustomerSearch("");
  };

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
            <Button size="sm" variant="outline" onClick={() => {
              if (!activeOrderId) return;
              const dp = parseFloat(discountPercent) || 0;
              updateOrder.mutate({ id: activeOrderId, data: { discountPercent: dp } }, { onSuccess: () => refetchOrder() });
            }} className="h-8" data-testid="button-apply-discount">Apply</Button>
          </div>

          {activeOrderId && (
            <div className="flex items-start gap-2">
              <textarea
                placeholder="Order note for kitchen…"
                value={orderNote}
                onChange={e => setOrderNote(e.target.value)}
                rows={2}
                className="flex-1 text-xs resize-none rounded-md border border-input bg-background px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-order-note"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-auto py-1.5 text-xs"
                onClick={() => {
                  if (!activeOrderId) return;
                  updateOrder.mutate({ id: activeOrderId, data: { notes: orderNote } }, { onSuccess: () => refetchOrder() });
                }}
                data-testid="button-save-order-note"
              >
                Save
              </Button>
            </div>
          )}

          {isTimedArea && activeOrderId && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2">
              <Timer className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {elapsedMins < 60
                  ? `${elapsedMins}m elapsed`
                  : `${Math.floor(elapsedMins / 60)}h ${elapsedMins % 60}m elapsed`}
                {selectedTable?.area?.hourlyRate && (
                  <span className="text-muted-foreground ml-1">
                    · est. ${((elapsedMins / 60) * Number(selectedTable.area.hourlyRate)).toFixed(2)}
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
            {timeFee > 0 && (
              <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center gap-1"><Timer className="w-3 h-3" />Room charge</span>
                <span>${timeFee.toFixed(2)}</span>
              </div>
            )}
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Total summary */}
            <div className="flex justify-between items-baseline">
              <Label>Total Due</Label>
              <p className="text-2xl font-bold">${total.toFixed(2)}</p>
            </div>

            {/* Paid legs so far */}
            {paidLegs.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-sm">
                {paidLegs.map((leg, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>{leg.label ?? leg.method}</span>
                    <span>${leg.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-primary border-t border-border pt-1 mt-1">
                  <span>Remaining</span>
                  <span>${remainingBalance.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Payment method picker */}
            <div>
              <Label className="mb-2 block">Payment Method</Label>
              <div className="flex gap-2">
                {([
                  { mode: "cash" as PayMode, icon: Banknote, label: "Cash" },
                  { mode: "bank_transfer" as PayMode, icon: Building2, label: "Bank Transfer" },
                  { mode: "credit" as PayMode, icon: CreditCard, label: "Credit" },
                ]).map(({ mode, icon: Icon, label }) => (
                  <button key={mode} onClick={() => switchPayMode(mode)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${payMode === mode ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"}`}
                    data-testid={`button-pay-mode-${mode}`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount field — shown for all modes */}
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder={remainingBalance.toFixed(2)}
                data-testid="input-pay-amount"
              />
            </div>

            {/* Bank Transfer — slip upload */}
            {payMode === "bank_transfer" && (
              <div>
                <Label className="mb-2 block">Transfer Slip</Label>
                <input
                  ref={slipInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSlipFileName(file.name);
                    await uploadFile(file);
                  }}
                />
                {slipImagePath ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{slipFileName}</span>
                    <button className="ml-auto text-xs underline" onClick={() => { setSlipImagePath(null); setSlipFileName(null); }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" disabled={isUploading}
                    onClick={() => slipInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Transfer Slip"}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-1">Photo or PDF of the bank transfer receipt</p>
              </div>
            )}

            {/* Credit — customer picker */}
            {payMode === "credit" && (
              <div className="space-y-2">
                <Label>Customer</Label>
                {selectedCustomer ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{selectedCustomer.name}</p>
                      <p className="text-xs text-muted-foreground">Balance: ${Number(selectedCustomer.creditBalance).toFixed(2)}</p>
                    </div>
                    <button className="text-xs underline text-muted-foreground" onClick={() => setSelectedCustomer(null)}>
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Search customer name or phone..."
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                    />
                    {customers.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                        {(customers as Customer[]).map((c: Customer) => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 text-left text-sm border-b border-border last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.phone ?? ""}</p>
                            </div>
                            <span className="text-xs font-semibold text-primary">${Number(c.creditBalance).toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {customerSearch && customers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No customers found</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancel</Button>
            <Button
              onClick={submitPaymentLeg}
              disabled={
                recordPayment.isPending || isUploading ||
                (payMode === "bank_transfer" && !slipImagePath) ||
                (payMode === "credit" && !selectedCustomer)
              }
              data-testid="button-confirm-payment">
              <Receipt className="w-4 h-4 mr-2" />Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
