import { useState } from "react";
import { useListStaff, getListStaffQueryKey, useCreateStaff, useUpdateStaff, useDeleteStaff, useListOutlets, getListOutletsQueryKey, StaffInputRole, StaffUpdateRole } from "@workspace/api-client-react";
import type { Staff } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  cashier: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  kitchen: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

type Form = { outletId: string; name: string; role: string; pin: string };
const empty: Form = { outletId: "", name: "", role: "cashier", pin: "" };

export default function Staff() {
  const { auth } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isSuperAdmin = auth?.staff.role === "super_admin";
  const outletId = isSuperAdmin ? undefined : auth?.outlet.id;

  const { data: staff, isLoading } = useListStaff(
    outletId ? { outletId } : {},
    { query: { queryKey: getListStaffQueryKey(outletId ? { outletId } : {}) } }
  );
  const { data: outlets } = useListOutlets({ query: { queryKey: getListOutletsQueryKey() } });
  const create = useCreateStaff();
  const upd = useUpdateStaff();
  const del = useDeleteStaff();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const field = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const invalidate = () => qc.invalidateQueries({ queryKey: getListStaffQueryKey(outletId ? { outletId } : {}) });

  const openCreate = () => { setEditing(null); setForm({ ...empty, outletId: outletId?.toString() ?? "" }); setOpen(true); };
  const openEdit = (s: Staff) => {
    setEditing(s.id);
    setForm({ outletId: s.outletId?.toString() ?? "", name: s.name, role: s.role, pin: "" });
    setOpen(true);
  };

  const submit = (): void => {
    const baseData: { name: string; role: string; outletId: number | null; pin?: string } = {
      name: form.name,
      role: form.role,
      outletId: form.outletId ? parseInt(form.outletId) : null,
    };
    if (form.pin) baseData.pin = form.pin;

    if (editing === null) {
      if (!form.pin) { toast({ variant: "destructive", title: "PIN is required" }); return; }
      create.mutate({ data: { ...baseData, pin: form.pin, role: form.role as StaffInputRole } }, {
        onSuccess: () => { toast({ title: "Staff created" }); setOpen(false); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Failed to create" }),
      });
    } else {
      upd.mutate({ id: editing, data: { ...baseData, role: baseData.role as StaffUpdateRole | undefined } }, {
        onSuccess: () => { toast({ title: "Staff updated" }); setOpen(false); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Failed to update" }),
      });
    }
  };

  const remove = (id: number) => {
    if (!confirm("Delete this staff member?")) return;
    del.mutate({ id }, {
      onSuccess: () => { toast({ title: "Staff deleted" }); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
    });
  };

  const getOutletName = (id: number | null) => id ? (outlets?.find(o => o.id === id)?.name ?? "Unknown") : "All Outlets";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground mt-1">Manage your team</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-staff"><Plus className="w-4 h-4 mr-2" />Add Staff</Button>
      </div>

      {isLoading ? <div className="text-muted-foreground">Loading...</div> : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Outlet</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {staff?.map((s: Staff, i: number) => (
                <tr key={s.id} data-testid={`row-staff-${s.id}`} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[s.role] ?? ""}`}>
                      {s.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{getOutletName(s.outletId ?? null)}</td>
                  <td className="px-4 py-3 flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)} data-testid={`button-edit-staff-${s.id}`}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(s.id)} data-testid={`button-delete-staff-${s.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!staff?.length && <div className="p-8 text-center text-muted-foreground">No staff found</div>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === null ? "Add Staff" : "Edit Staff"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={field("name")} data-testid="input-staff-name" /></div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger data-testid="select-staff-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <div>
                <Label>Outlet</Label>
                <Select value={form.outletId} onValueChange={v => setForm(f => ({ ...f, outletId: v }))}>
                  <SelectTrigger data-testid="select-staff-outlet"><SelectValue placeholder="Select outlet..." /></SelectTrigger>
                  <SelectContent>
                    {outlets?.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>{editing === null ? "PIN (4 digits)" : "New PIN (leave blank to keep)"}</Label><Input type="password" maxLength={4} value={form.pin} onChange={field("pin")} data-testid="input-staff-pin" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending || upd.isPending} data-testid="button-save-staff">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
