import { useState, useEffect } from "react";
import { useGetOutlet, getGetOutletQueryKey, useUpdateOutlet, useListOutlets } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, QrCode, Copy, ExternalLink, Check, Globe, Building2 } from "lucide-react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { formatMoney } from "@/lib/currency";

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
  const { auth, setAuth } = useAuth();
  const isSuperAdmin = auth!.staff.role === "super_admin";
  const sessionOutletId = auth!.outlet.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: outlets } = useListOutlets();
  const [pickOutletId, setPickOutletId] = useState(sessionOutletId > 0 ? sessionOutletId : 0);
  const outletId = isSuperAdmin && sessionOutletId === 0 ? pickOutletId : sessionOutletId;

  const { data: systemSettings } = useQuery({
    queryKey: ["settings", "system"],
    queryFn: async () => {
      const res = await fetch("/api/settings/system", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ defaultCurrency: string }>;
    },
  });
  const [defaultCurrency, setDefaultCurrency] = useState("MVR");
  useEffect(() => {
    if (systemSettings?.defaultCurrency) setDefaultCurrency(systemSettings.defaultCurrency);
  }, [systemSettings]);

  const { data: outlet } = useGetOutlet(outletId, {
    query: { queryKey: getGetOutletQueryKey(outletId), enabled: outletId > 0 },
  });
  const update = useUpdateOutlet();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    taxRate: "",
    currency: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankBranch: "",
    bankTransferNote: "",
    businessTin: "",
  });

  useEffect(() => {
    if (outlet) {
      setForm({
        name: outlet.name,
        address: outlet.address,
        phone: outlet.phone,
        taxRate: outlet.taxRate?.toString() ?? "0",
        currency: outlet.currency,
        bankName: outlet.bankName ?? "",
        bankAccountName: outlet.bankAccountName ?? "",
        bankAccountNumber: outlet.bankAccountNumber ?? "",
        bankBranch: outlet.bankBranch ?? "",
        bankTransferNote: outlet.bankTransferNote ?? "",
      });
    }
  }, [outlet]);

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const textField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
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
          bankName: form.bankName.trim() || null,
          bankAccountName: form.bankAccountName.trim() || null,
          bankAccountNumber: form.bankAccountNumber.trim() || null,
          bankBranch: form.bankBranch.trim() || null,
          bankTransferNote: form.bankTransferNote.trim() || null,
          businessTin: form.businessTin.replace(/\D/g, "") || null,
        } as Parameters<typeof update.mutate>[0]["data"],
      },
      {
        onSuccess: (updated) => {
          toast({ title: "Settings saved" });
          qc.invalidateQueries({ queryKey: getGetOutletQueryKey(outletId) });
          if (auth && sessionOutletId === outletId) setAuth({ ...auth, outlet: updated });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to save" }),
      }
    );
  };

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Currency and outlet configuration</p>
      </div>

      {isSuperAdmin && (
        <div className="border border-border rounded-xl p-6 bg-card space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Globe className="w-4 h-4" /> Universal default currency
          </h2>
          <p className="text-sm text-muted-foreground">
            Fallback for consolidated views. Each outlet can set its own currency below.
          </p>
          <CurrencySelect value={defaultCurrency} onChange={setDefaultCurrency} />
          <p className="text-xs text-muted-foreground">Preview: {formatMoney(15, defaultCurrency)}</p>
          <Button
            size="sm"
            onClick={async () => {
              const res = await fetch("/api/settings/system", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ defaultCurrency }),
              });
              if (!res.ok) { toast({ variant: "destructive", title: "Failed to save" }); return; }
              toast({ title: "Default currency saved" });
              qc.invalidateQueries({ queryKey: ["settings", "system"] });
              if (sessionOutletId === 0 && auth) setAuth({ ...auth, outlet: { ...auth.outlet, currency: defaultCurrency } });
            }}
          >
            Save default
          </Button>
        </div>
      )}

      {isSuperAdmin && sessionOutletId === 0 && (
        <div>
          <Label>Edit outlet</Label>
          <select
            className="w-full mt-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={pickOutletId || ""}
            onChange={(e) => setPickOutletId(Number(e.target.value))}
          >
            <option value="">Select outlet…</option>
            {(outlets ?? []).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}

      {outletId > 0 && <QrCodeCard outletId={outletId} />}

      {outletId > 0 && (
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
              <CurrencySelect value={form.currency || "MVR"} onChange={(c) => setForm((f) => ({ ...f, currency: c }))} />
              <p className="text-xs text-muted-foreground mt-1">Preview: {formatMoney(100, form.currency || "MVR")}</p>
            </div>
          </div>
          <div>
            <Label>Business TIN (13 digits)</Label>
            <Input
              value={form.businessTin}
              onChange={field("businessTin")}
              placeholder="0000000000000"
              maxLength={13}
              data-testid="input-settings-tin"
            />
            <p className="text-xs text-muted-foreground mt-1">Used on MIRA GST reports (MIRA 205).</p>
          </div>
        </div>

        <div className="border-t border-border pt-6 space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Bank transfer (customer QR pay)
          </h2>
          <p className="text-sm text-muted-foreground">
            Shown on receipts when customers scan to pay online. Bank transfer with slip upload only on the pay page.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Bank name</Label>
              <Input value={form.bankName} onChange={field("bankName")} data-testid="input-bank-name" />
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={form.bankBranch} onChange={field("bankBranch")} placeholder="Optional" data-testid="input-bank-branch" />
            </div>
            <div>
              <Label>Account name</Label>
              <Input value={form.bankAccountName} onChange={field("bankAccountName")} data-testid="input-bank-account-name" />
            </div>
            <div>
              <Label>Account number</Label>
              <Input value={form.bankAccountNumber} onChange={field("bankAccountNumber")} data-testid="input-bank-account-number" />
            </div>
          </div>
          <div>
            <Label>Instructions for customers</Label>
            <textarea
              value={form.bankTransferNote}
              onChange={textField("bankTransferNote")}
              rows={3}
              className="w-full mt-1.5 text-sm rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="input-bank-transfer-note"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={update.isPending} data-testid="button-save-settings">
            <Save className="w-4 h-4 mr-2" />Save Changes
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}
