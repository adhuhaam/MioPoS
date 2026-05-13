import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Package, TrendingDown, TrendingUp,
  AlertTriangle, ClipboardList, DollarSign
} from "lucide-react";

type InventoryItem = {
  id: number; outletId: number; name: string; unit: string; category: string | null;
  currentStock: string; costPerUnit: string; lowStockThreshold: string;
};
type SupplyLog = {
  id: number; inventoryItemId: number; inventoryItemName: string; unit: string;
  quantity: string; costPerUnit: string | null; totalCost: string | null;
  note: string | null; suppliedAt: string;
};

type Tab = "stock" | "supply" | "logs";

const UNITS = ["piece", "kg", "g", "litre", "ml", "carton", "box", "bottle", "bag", "pack", "dozen"];

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const fmtNum = (v: string | number, dp = 2) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export default function Inventory() {
  const { auth } = useAuth();
  const outletId = auth!.outlet.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("stock");

  // ─── Items ────────────────────────────────────────────────────────────────
  const itemsKey = ["inventory/items", outletId];
  const { data: items = [] } = useQuery<InventoryItem[]>({
    queryKey: itemsKey,
    queryFn: () => apiFetch(`/api/inventory/items?outletId=${outletId}`),
  });

  const [itemDialog, setItemDialog] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", unit: "piece", category: "", costPerUnit: "0", lowStockThreshold: "0" });

  const saveItemMut = useMutation({
    mutationFn: (data: typeof itemForm) =>
      editItem
        ? apiFetch(`/api/inventory/items/${editItem.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, costPerUnit: parseFloat(data.costPerUnit), lowStockThreshold: parseFloat(data.lowStockThreshold) }),
          })
        : apiFetch("/api/inventory/items", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ outletId, ...data, costPerUnit: parseFloat(data.costPerUnit), lowStockThreshold: parseFloat(data.lowStockThreshold) }),
          }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: itemsKey }); setItemDialog(false); toast({ title: editItem ? "Item updated" : "Item created" }); },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const deleteItemMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/inventory/items/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: itemsKey }); toast({ title: "Item deleted" }); },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const openNewItem = () => { setEditItem(null); setItemForm({ name: "", unit: "piece", category: "", costPerUnit: "0", lowStockThreshold: "0" }); setItemDialog(true); };
  const openEditItem = (i: InventoryItem) => { setEditItem(i); setItemForm({ name: i.name, unit: i.unit, category: i.category ?? "", costPerUnit: String(i.costPerUnit), lowStockThreshold: String(i.lowStockThreshold) }); setItemDialog(true); };

  // ─── Supply ───────────────────────────────────────────────────────────────
  const [supplyForm, setSupplyForm] = useState({ inventoryItemId: "", quantity: "", costPerUnit: "", note: "" });
  const [supplySubmitting, setSupplySubmitting] = useState(false);

  const recordSupply = async () => {
    if (!supplyForm.inventoryItemId || !supplyForm.quantity) {
      toast({ variant: "destructive", title: "Select an item and enter quantity" }); return;
    }
    setSupplySubmitting(true);
    try {
      await apiFetch("/api/inventory/supply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          inventoryItemId: parseInt(supplyForm.inventoryItemId),
          quantity: parseFloat(supplyForm.quantity),
          costPerUnit: supplyForm.costPerUnit ? parseFloat(supplyForm.costPerUnit) : undefined,
          note: supplyForm.note || undefined,
        }),
      });
      qc.invalidateQueries({ queryKey: itemsKey });
      qc.invalidateQueries({ queryKey: ["inventory/supply-logs", outletId] });
      setSupplyForm({ inventoryItemId: "", quantity: "", costPerUnit: "", note: "" });
      toast({ title: "Supply recorded successfully" });
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message });
    } finally {
      setSupplySubmitting(false);
    }
  };

  // ─── Logs ─────────────────────────────────────────────────────────────────
  const logsKey = ["inventory/supply-logs", outletId];
  const { data: logs = [] } = useQuery<SupplyLog[]>({
    queryKey: logsKey,
    queryFn: () => apiFetch(`/api/inventory/supply-logs?outletId=${outletId}`),
    enabled: activeTab === "logs",
  });

  // ─── Derived stats ────────────────────────────────────────────────────────
  const lowStockItems = items.filter(i => parseFloat(i.currentStock) <= parseFloat(i.lowStockThreshold) && parseFloat(i.lowStockThreshold) > 0);
  const totalStockValue = items.reduce((sum, i) => sum + parseFloat(i.currentStock) * parseFloat(i.costPerUnit), 0);
  const categories = [...new Set(items.map(i => i.category ?? "Uncategorised"))].sort();

  const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "stock", label: "Stock Levels", icon: Package },
    { key: "supply", label: "Record Supply", icon: TrendingUp },
    { key: "logs", label: "Supply Logs", icon: ClipboardList },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b border-border px-4 flex items-center gap-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 py-3 px-1 text-sm font-medium border-b-2 transition-colors mr-3 ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
        <div className="flex-1" />
        {activeTab === "stock" && (
          <Button size="sm" onClick={openNewItem}><Plus className="w-4 h-4 mr-1" />Add Item</Button>
        )}
      </div>

      {/* ── STOCK TAB ── */}
      {activeTab === "stock" && (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Items", value: String(items.length), icon: Package, color: "text-blue-600 bg-blue-50" },
              { label: "Low Stock Alerts", value: String(lowStockItems.length), icon: AlertTriangle, color: lowStockItems.length > 0 ? "text-amber-600 bg-amber-50" : "text-muted-foreground bg-muted" },
              { label: "Stock Value", value: `$${fmtNum(totalStockValue)}`, icon: DollarSign, color: "text-green-600 bg-green-50" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color.split(" ")[1]}`}><Icon className={`w-5 h-5 ${color.split(" ")[0]}`} /></div>
                <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
              </div>
            ))}
          </div>

          {/* Low stock banner */}
          {lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Low Stock Alert</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map(i => (
                  <Badge key={i.id} variant="outline" className="text-amber-700 border-amber-300 bg-amber-100">
                    {i.name}: {fmtNum(i.currentStock, 4)} {i.unit}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Items by category */}
          {categories.map(cat => {
            const catItems = items.filter(i => (i.category ?? "Uncategorised") === cat);
            return (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h3>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground text-xs">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Item</th>
                        <th className="text-right px-4 py-2.5 font-medium">Stock</th>
                        <th className="text-right px-4 py-2.5 font-medium">Min</th>
                        <th className="text-right px-4 py-2.5 font-medium">Unit Cost</th>
                        <th className="text-right px-4 py-2.5 font-medium">Value</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {catItems.map(item => {
                        const stock = parseFloat(item.currentStock);
                        const threshold = parseFloat(item.lowStockThreshold);
                        const isLow = threshold > 0 && stock <= threshold;
                        const value = stock * parseFloat(item.costPerUnit);
                        return (
                          <tr key={item.id} className={isLow ? "bg-amber-50/50" : ""}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                                <span className="font-medium">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-semibold ${isLow ? "text-amber-600" : stock < 0 ? "text-red-600" : ""}`}>
                                {fmtNum(stock, 4)}
                              </span>
                              <span className="text-muted-foreground ml-1 text-xs">{item.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{fmtNum(threshold, 4)}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">${fmtNum(item.costPerUnit)}</td>
                            <td className="px-4 py-3 text-right font-medium">${fmtNum(value)}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => openEditItem(item)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                                <button onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteItemMut.mutate(item.id); }} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {!items.length && (
            <div className="text-center py-20 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No inventory items yet</p>
              <p className="text-sm mt-1">Click "Add Item" to start tracking ingredients and supplies.</p>
            </div>
          )}
        </div>
      )}

      {/* ── SUPPLY TAB ── */}
      {activeTab === "supply" && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Record Supply Delivery</h2>
              <p className="text-sm text-muted-foreground mt-1">Log incoming stock. The quantity will be added to the current inventory level.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div>
                <Label>Inventory Item</Label>
                <select value={supplyForm.inventoryItemId} onChange={e => {
                  const item = items.find(i => i.id === parseInt(e.target.value));
                  setSupplyForm(f => ({ ...f, inventoryItemId: e.target.value, costPerUnit: item?.costPerUnit ?? "" }));
                }}
                  className="w-full mt-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Select an item…</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.unit}) — current: {fmtNum(i.currentStock, 4)}</option>
                  ))}
                </select>
                {!items.length && <p className="text-xs text-muted-foreground mt-1">Add inventory items first in the Stock tab.</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity Received</Label>
                  <Input className="mt-1.5" type="number" step="0.0001" min="0.0001"
                    placeholder="e.g. 24" value={supplyForm.quantity}
                    onChange={e => setSupplyForm(f => ({ ...f, quantity: e.target.value }))} />
                  {supplyForm.inventoryItemId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Unit: {items.find(i => i.id === parseInt(supplyForm.inventoryItemId))?.unit}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Cost per Unit (optional)</Label>
                  <Input className="mt-1.5" type="number" step="0.0001" min="0"
                    placeholder="Leave blank to keep current"
                    value={supplyForm.costPerUnit}
                    onChange={e => setSupplyForm(f => ({ ...f, costPerUnit: e.target.value }))} />
                </div>
              </div>

              {supplyForm.quantity && supplyForm.costPerUnit && (
                <div className="bg-muted rounded-lg px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Total delivery cost: </span>
                  <span className="font-semibold">${fmtNum(parseFloat(supplyForm.quantity) * parseFloat(supplyForm.costPerUnit))}</span>
                </div>
              )}

              <div>
                <Label>Note (optional)</Label>
                <Input className="mt-1.5" placeholder="e.g. Supplier: ABC Wholesale, Invoice #1234"
                  value={supplyForm.note} onChange={e => setSupplyForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              <Button className="w-full" onClick={recordSupply} disabled={supplySubmitting}>
                <TrendingUp className="w-4 h-4 mr-2" />
                {supplySubmitting ? "Recording…" : "Record Supply"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {activeTab === "logs" && (
        <div className="flex-1 overflow-auto p-6">
          <h2 className="text-lg font-semibold mb-4">Supply History</h2>
          {logs.length > 0 ? (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Date & Time</th>
                    <th className="text-left px-4 py-2.5 font-medium">Item</th>
                    <th className="text-right px-4 py-2.5 font-medium">Quantity</th>
                    <th className="text-right px-4 py-2.5 font-medium">Unit Cost</th>
                    <th className="text-right px-4 py-2.5 font-medium">Total Cost</th>
                    <th className="text-left px-4 py-2.5 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.suppliedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.inventoryItemName}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-green-600 font-semibold">+{fmtNum(log.quantity, 4)}</span>
                        <span className="text-muted-foreground ml-1 text-xs">{log.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {log.costPerUnit ? `$${fmtNum(log.costPerUnit)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {log.totalCost ? `$${fmtNum(log.totalCost)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{log.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No supply logs yet</p>
              <p className="text-sm mt-1">Supply deliveries recorded in the Supply tab will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Item Dialog ── */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Inventory Item" : "New Inventory Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input className="mt-1.5" placeholder="e.g. Jasmine Rice" value={itemForm.name}
                onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit of Measure</Label>
                <select value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full mt-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <Label>Category (optional)</Label>
                <Input className="mt-1.5" placeholder="e.g. Dry Goods" value={itemForm.category}
                  onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cost per Unit ($)</Label>
                <Input className="mt-1.5" type="number" step="0.0001" min="0" value={itemForm.costPerUnit}
                  onChange={e => setItemForm(f => ({ ...f, costPerUnit: e.target.value }))} />
              </div>
              <div>
                <Label>Low Stock Alert At</Label>
                <Input className="mt-1.5" type="number" step="0.0001" min="0" value={itemForm.lowStockThreshold}
                  onChange={e => setItemForm(f => ({ ...f, lowStockThreshold: e.target.value }))}
                  placeholder="0 = no alert" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button onClick={() => saveItemMut.mutate(itemForm)} disabled={!itemForm.name || saveItemMut.isPending}>
              {saveItemMut.isPending ? "Saving…" : editItem ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
