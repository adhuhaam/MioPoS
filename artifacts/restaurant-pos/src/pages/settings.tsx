import { useState, useEffect } from "react";
import { useGetOutlet, getGetOutletQueryKey, useUpdateOutlet } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, QrCode, Copy, ExternalLink, Check } from "lucide-react";

function QrCodeCard({ outletId }: { outletId: number }) {
  const [copied, setCopied] = useState(false);

  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const menuUrl = `${window.location.origin}${base}/qr/${outletId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${encodeURIComponent(menuUrl)}`;

  const copy = () => {
    navigator.clipboard.writeText(menuUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="border border-border rounded-xl p-6 bg-card space-y-5">
      <div>
        <h2 className="font-semibold text-base flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          QR Menu
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Share this QR code with customers so they can browse your menu from their phone — no app required.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* QR code */}
        <div className="flex-shrink-0 border border-border rounded-xl p-3 bg-white shadow-sm">
          <img
            src={qrSrc}
            alt="QR code for public menu"
            width={160}
            height={160}
            className="block"
            loading="lazy"
          />
        </div>

        {/* Actions */}
        <div className="flex-1 space-y-4 w-full">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Public Menu URL</Label>
            <div className="flex gap-2">
              <Input
                value={menuUrl}
                readOnly
                className="font-mono text-xs bg-muted/50 border-border"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copy} className="gap-2">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(menuUrl, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview Menu
            </Button>
            <a
              href={qrSrc.replace("220x220", "600x600")}
              download="qr-menu.png"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <QrCode className="w-3.5 h-3.5" />
                Download QR
              </Button>
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            Print this QR code and place it on tables, doors, or marketing materials.
            Customers can scan it to view your full menu with prices.
          </p>
        </div>
      </div>
    </div>
  );
}

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

      {/* QR Menu section */}
      <QrCodeCard outletId={outletId} />

      {/* Outlet details */}
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
