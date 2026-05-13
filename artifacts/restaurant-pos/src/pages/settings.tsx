import { useState, useEffect } from "react";
import { useGetOutlet, getGetOutletQueryKey, useUpdateOutlet } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function Settings() {
  const { auth } = useAuth();
  const outletId = auth!.outlet.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: outlet } = useGetOutlet(outletId, { query: { queryKey: getGetOutletQueryKey(outletId) } });
  const update = useUpdateOutlet();

  const [form, setForm] = useState({ name: "", address: "", phone: "", taxRate: "", currency: "" });

  useEffect(() => {
    if (outlet) {
      setForm({
        name: outlet.name,
        address: outlet.address,
        phone: outlet.phone,
        taxRate: outlet.taxRate?.toString() ?? "0",
        currency: outlet.currency,
      });
    }
  }, [outlet]);

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = () => {
    update.mutate(
      {
        id: outletId,
        data: {
          name: form.name,
          address: form.address,
          phone: form.phone,
          taxRate: parseFloat(form.taxRate),
          currency: form.currency,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Settings saved" });
          qc.invalidateQueries({ queryKey: getGetOutletQueryKey(outletId) });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to save" }),
      }
    );
  };

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Outlet configuration</p>
      </div>

      <div className="border border-border rounded-xl p-6 bg-card space-y-6">
        <h2 className="font-semibold text-base">Outlet Details</h2>
        <div className="space-y-4">
          <div>
            <Label>Outlet Name</Label>
            <Input value={form.name} onChange={field("name")} data-testid="input-settings-name" />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={field("address")} data-testid="input-settings-address" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={field("phone")} data-testid="input-settings-phone" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tax Rate (%)</Label>
              <Input type="number" step="0.01" value={form.taxRate} onChange={field("taxRate")} data-testid="input-settings-tax" />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={form.currency} onChange={field("currency")} data-testid="input-settings-currency" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={update.isPending} data-testid="button-save-settings">
            <Save className="w-4 h-4 mr-2" />Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
