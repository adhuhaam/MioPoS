import { useState } from "react";
import {
  useListCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useAdjustCustomerCredit,
} from "@workspace/api-client-react";
import type { Customer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Search, Pencil, Trash2, CreditCard, Plus, Minus } from "lucide-react";

type FormState = { name: string; phone: string; email: string; notes: string };

const emptyForm = (): FormState => ({ name: "", phone: "", email: "", notes: "" });

export default function Customers() {
  const { auth } = useAuth();
  const outletId = auth!.outlet.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditOp, setCreditOp] = useState<"add" | "deduct">("add");

  const { data: customers = [], isLoading } = useListCustomers({ outletId, search: search || undefined });

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const adjustCredit = useAdjustCustomerCredit();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["listCustomers"] });

  const openAdd = () => { setForm(emptyForm()); setAddOpen(true); };
  const openEdit = (c: Customer) => { setEditCustomer(c); setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "" }); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editCustomer) {
      updateCustomer.mutate(
        { id: editCustomer.id, data: { name: form.name, phone: form.phone || undefined, email: form.email || undefined, notes: form.notes || undefined } },
        {
          onSuccess: () => { setEditCustomer(null); invalidate(); toast({ title: "Customer updated" }); },
          onError: () => toast({ variant: "destructive", title: "Update failed" }),
        }
      );
    } else {
      createCustomer.mutate(
        { data: { name: form.name, phone: form.phone || undefined, email: form.email || undefined, notes: form.notes || undefined, outletId } },
        {
          onSuccess: () => { setAddOpen(false); setForm(emptyForm()); invalidate(); toast({ title: "Customer registered" }); },
          onError: () => toast({ variant: "destructive", title: "Registration failed" }),
        }
      );
    }
  };

  const handleDelete = (c: Customer) => {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    deleteCustomer.mutate(
      { id: c.id },
      {
        onSuccess: () => { invalidate(); toast({ title: "Customer deleted" }); },
        onError: () => toast({ variant: "destructive", title: "Delete failed" }),
      }
    );
  };

  const handleCredit = () => {
    if (!creditCustomer) return;
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) return;
    adjustCredit.mutate(
      { id: creditCustomer.id, data: { amount, operation: creditOp } },
      {
        onSuccess: () => {
          setCreditCustomer(null);
          setCreditAmount("");
          invalidate();
          toast({ title: `Credit ${creditOp === "add" ? "added" : "deducted"} successfully` });
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : "Operation failed";
          toast({ variant: "destructive", title: msg });
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Register and manage customer accounts</p>
        </div>
        <Button onClick={openAdd}>
          <UserPlus className="w-4 h-4 mr-2" />
          Register Customer
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-16">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No customers found</p>
          {search && <p className="text-sm mt-1">Try a different search term</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c: Customer) => (
            <div key={c.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact info"}
                </p>
                {c.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{c.notes}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-primary">${Number(c.creditBalance).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">credit</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setCreditOp("add"); setCreditAmount(""); setCreditCustomer(c); }}
                  title="Adjust credit">
                  <CreditCard className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Edit">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}
                  className="text-destructive hover:text-destructive" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={addOpen || !!editCustomer} onOpenChange={open => { if (!open) { setAddOpen(false); setEditCustomer(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit Customer" : "Register Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+60 12-345 6789" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="customer@email.com" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Allergy info, preferences..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditCustomer(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || createCustomer.isPending || updateCustomer.isPending}>
              {editCustomer ? "Save Changes" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit adjustment dialog */}
      <Dialog open={!!creditCustomer} onOpenChange={open => { if (!open) setCreditCustomer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credit — {creditCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-primary">${Number(creditCustomer?.creditBalance ?? 0).toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCreditOp("add")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${creditOp === "add" ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "border-border hover:bg-muted/50"}`}>
                <Plus className="w-4 h-4" />Add Credit
              </button>
              <button
                onClick={() => setCreditOp("deduct")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${creditOp === "deduct" ? "border-destructive bg-destructive/10 text-destructive" : "border-border hover:bg-muted/50"}`}>
                <Minus className="w-4 h-4" />Deduct
              </button>
            </div>
            <div>
              <Label>Amount (USD)</Label>
              <Input type="number" step="0.01" min="0.01" value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditCustomer(null)}>Cancel</Button>
            <Button
              onClick={handleCredit}
              disabled={!creditAmount || parseFloat(creditAmount) <= 0 || adjustCredit.isPending}
              className={creditOp === "deduct" ? "bg-destructive hover:bg-destructive/90" : ""}>
              {creditOp === "add" ? "Add Credit" : "Deduct Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
