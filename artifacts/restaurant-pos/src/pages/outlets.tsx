import { useState } from "react";
import { useListOutlets, getListOutletsQueryKey, useCreateOutlet, useUpdateOutlet, useDeleteOutlet } from "@workspace/api-client-react";
import type { Outlet } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Store, QrCode, Copy, ExternalLink, Check } from "lucide-react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { useCurrency } from "@/hooks/useCurrency";
import { formatMoney } from "@/lib/currency";

type OutletForm = { name: string; address: string; phone: string; taxRate: string; currency: string };
const empty: OutletForm = { name: "", address: "", phone: "", taxRate: "0", currency: "MVR" };

function QrDialog({ outlet, open, onClose }: { outlet: Outlet; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const menuUrl = `${window.location.origin}${base}/qr/${outlet.id}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=M&data=${encodeURIComponent(menuUrl)}`;

  const copy = () => {
    navigator.clipboard.writeText(menuUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            QR Menu — {outlet.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="border border-border rounded-xl p-3 bg-white shadow-sm">
            <img src={qrSrc} alt="QR code" width={180} height={180} className="block" />
          </div>

          <p className="text-xs text-muted-foreground text-center px-2">
            Customers scan this code to view the full menu on their phone — no app needed.
          </p>

          <div className="w-full space-y-2">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground font-mono flex-1 truncate">{menuUrl}</span>
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="outline" size="sm" onClick={copy} className="gap-2">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(menuUrl, "_blank")}>
                <ExternalLink className="w-3.5 h-3.5" />
                Preview
              </Button>
              <a href={qrSrc.replace("240x240", "600x600")} download={`qr-${outlet.name}.png`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <QrCode className="w-3.5 h-3.5" />
                  Download
                </Button>
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Outlets() {
  const { defaultCurrency } = useCurrency();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: outlets, isLoading } = useListOutlets({ query: { queryKey: getListOutletsQueryKey() } });
  const create = useCreateOutlet();
  const update = useUpdateOutlet();
  const remove = useDeleteOutlet();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<OutletForm>(empty);
  const [qrOutlet, setQrOutlet] = useState<Outlet | null>(null);

  const field = (k: keyof OutletForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => { setEditing(null); setForm({ ...empty, currency: defaultCurrency }); setOpen(true); };
  const openEdit = (o: Outlet) => {
    setEditing(o.id);
    setForm({ name: o.name, address: o.address, phone: o.phone, taxRate: String(o.taxRate ?? "0"), currency: o.currency });
    setOpen(true);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: getListOutletsQueryKey() });

  const submit = () => {
    const data = { name: form.name, address: form.address, phone: form.phone, taxRate: parseFloat(form.taxRate), currency: form.currency };
    if (editing === null) {
      create.mutate({ data }, {
        onSuccess: () => { toast({ title: "Outlet created" }); setOpen(false); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Failed to create outlet" }),
      });
    } else {
      update.mutate({ id: editing, data }, {
        onSuccess: () => { toast({ title: "Outlet updated" }); setOpen(false); invalidate(); },
        onError: () => toast({ variant: "destructive", title: "Failed to update outlet" }),
      });
    }
  };

  const del = (id: number) => {
    if (!confirm("Delete this outlet? This will remove all its data.")) return;
    remove.mutate({ id }, {
      onSuccess: () => { toast({ title: "Outlet deleted" }); invalidate(); },
      onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outlets</h1>
          <p className="text-muted-foreground mt-1">Manage your restaurant branches</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-outlet"><Plus className="w-4 h-4 mr-2" />New Outlet</Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {outlets?.map((outlet: Outlet) => (
            <div key={outlet.id} data-testid={`card-outlet-${outlet.id}`} className="border border-border rounded-xl p-5 bg-card space-y-3 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">{outlet.name}</p>
                    <p className="text-xs text-muted-foreground">{outlet.currency}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    title="QR Menu"
                    onClick={() => setQrOutlet(outlet)}
                    data-testid={`button-qr-outlet-${outlet.id}`}
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(outlet)} data-testid={`button-edit-outlet-${outlet.id}`}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => del(outlet.id)} data-testid={`button-delete-outlet-${outlet.id}`}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{outlet.address}</p>
                <p>{outlet.phone}</p>
                <p className="text-xs">Tax: {String(outlet.taxRate)}%</p>
              </div>
              {/* QR preview strip */}
              <button
                onClick={() => setQrOutlet(outlet)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted transition-colors text-sm text-muted-foreground group"
              >
                <QrCode className="w-4 h-4 flex-shrink-0 group-hover:text-primary transition-colors" />
                <span className="truncate group-hover:text-foreground transition-colors">View QR Menu</span>
                <ExternalLink className="w-3.5 h-3.5 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Outlet create/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === null ? "New Outlet" : "Edit Outlet"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={field("name")} data-testid="input-outlet-name" /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={field("address")} data-testid="input-outlet-address" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={field("phone")} data-testid="input-outlet-phone" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tax Rate (%)</Label><Input type="number" value={form.taxRate} onChange={field("taxRate")} data-testid="input-outlet-tax" /></div>
              <div><Label>Currency</Label><CurrencySelect value={form.currency || defaultCurrency} onChange={(c) => setForm((f) => ({ ...f, currency: c }))} /><p className="text-xs text-muted-foreground mt-1">{formatMoney(100, form.currency || defaultCurrency)}</p></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending || update.isPending} data-testid="button-save-outlet">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      {qrOutlet && (
        <QrDialog outlet={qrOutlet} open={!!qrOutlet} onClose={() => setQrOutlet(null)} />
      )}
    </div>
  );
}
