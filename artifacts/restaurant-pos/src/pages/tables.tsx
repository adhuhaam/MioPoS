import { useState } from "react";
import { useLocation } from "wouter";
import { useListTables, getListTablesQueryKey, useCreateTable, useUpdateTable, useDeleteTable } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  available: "border-green-400 bg-green-50 dark:bg-green-900/20 hover:border-green-500",
  occupied: "border-amber-400 bg-amber-50 dark:bg-amber-900/20",
  bill_requested: "border-red-400 bg-red-50 dark:bg-red-900/20",
};
const STATUS_DOT: Record<string, string> = {
  available: "bg-green-500",
  occupied: "bg-amber-500",
  bill_requested: "bg-red-500",
};

type TableForm = { name: string; capacity: string };

export default function Tables() {
  const { auth } = useAuth();
  const outletId = auth!.outlet.id;
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tables, isLoading } = useListTables(
    { outletId },
    { query: { queryKey: getListTablesQueryKey({ outletId }), refetchInterval: 5000 } }
  );
  const create = useCreateTable();
  const update = useUpdateTable();
  const remove = useDeleteTable();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<TableForm>({ name: "", capacity: "4" });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListTablesQueryKey({ outletId }) });

  const openCreate = () => { setEditing(null); setForm({ name: "", capacity: "4" }); setOpen(true); };
  const openEdit = (t: any) => { setEditing(t); setForm({ name: t.name, capacity: t.capacity.toString() }); setOpen(true); };

  const save = () => {
    const data = { outletId, name: form.name, capacity: parseInt(form.capacity), status: "available" as const };
    if (editing) {
      update.mutate({ id: editing.id, data: { name: form.name, capacity: parseInt(form.capacity) } }, {
        onSuccess: () => { toast({ title: "Table updated" }); setOpen(false); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      });
    } else {
      create.mutate({ data }, {
        onSuccess: () => { toast({ title: "Table created" }); setOpen(false); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Failed" }),
      });
    }
  };

  const del = (id: number) => {
    if (!confirm("Delete this table?")) return;
    remove.mutate({ id }, { onSuccess: invalidate, onError: () => toast({ variant: "destructive", title: "Failed" }) });
  };

  const handleTableClick = (t: any) => {
    if (t.status === "available") {
      setLocation(`/pos?tableId=${t.id}`);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tables</h1>
          <p className="text-muted-foreground mt-1">Floor plan — click an available table to open the POS</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-table"><Plus className="w-4 h-4 mr-2" />Add Table</Button>
      </div>

      <div className="flex gap-4 text-sm">
        {Object.entries({ available: "Available", occupied: "Occupied", bill_requested: "Bill Requested" }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${STATUS_DOT[k]}`} />
            <span className="text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>

      {isLoading ? <div className="text-muted-foreground">Loading...</div> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables?.map(t => (
            <div key={t.id} data-testid={`card-table-${t.id}`}
              className={`border-2 rounded-xl p-4 transition-all ${STATUS_STYLE[t.status]} ${t.status === "available" ? "cursor-pointer" : "cursor-default"}`}
              onClick={() => handleTableClick(t)}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${STATUS_DOT[t.status]}`} />
                <div className="flex gap-0.5">
                  <button onClick={e => { e.stopPropagation(); openEdit(t); }} data-testid={`button-edit-table-${t.id}`} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"><Pencil className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); del(t.id); }} data-testid={`button-delete-table-${t.id}`} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <p className="font-bold text-lg leading-none">{t.name}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />{t.capacity}
              </div>
              <p className="text-xs mt-1 capitalize text-muted-foreground">{t.status.replace("_", " ")}</p>
            </div>
          ))}
          {!tables?.length && <div className="col-span-5 text-center text-muted-foreground py-12 text-sm">No tables configured</div>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Table" : "Add Table"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Table Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Table 1, Bar 3" data-testid="input-table-name" /></div>
            <div><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} data-testid="input-table-capacity" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={create.isPending || update.isPending} data-testid="button-save-table">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
