import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency";
import { Building2, CheckCircle2, Copy, Upload, Camera, Loader2, AlertCircle } from "lucide-react";

type BankDetails = {
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankBranch: string | null;
  bankTransferNote: string | null;
};

type PayInfo = {
  orderId: number;
  status: string;
  outletName: string;
  outletPhone?: string;
  currency: string;
  orderTotal: number;
  paidSoFar: number;
  amountDue: number;
  tableName: string;
  receiptRef: string;
  bank: BankDetails;
  bankReady: boolean;
};

export default function PayOrder() {
  const { orderId: orderIdParam } = useParams<{ orderId: string }>();
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("t") ?? ""
      : "";

  const [info, setInfo] = useState<PayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [slipPath, setSlipPath] = useState<string | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const orderId = parseInt(orderIdParam ?? "", 10);

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!orderId || !token) {
      setError("Invalid payment link");
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/public/pay/${orderId}?t=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error ?? "Failed to load payment");
        return data as PayInfo & { status?: string };
      })
      .then((data) => {
        if (data.status === "paid" || data.amountDue <= 0) {
          setSubmitted(true);
          setSubmitMsg("This order is already paid. Thank you!");
        }
        setInfo(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
      });
  }, [orderId, token]);

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !orderId) return;
    setIsUploading(true);
    setSlipPreview(URL.createObjectURL(file));
    const res = await fetch(
      `/api/public/pay/${orderId}/request-upload?t=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "image/jpeg",
        }),
      },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not prepare upload");
      setIsUploading(false);
      return;
    }
    const { uploadURL, objectPath } = await res.json();
    const put = await fetch(uploadURL, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "image/jpeg" },
    });
    if (!put.ok) {
      setError("Upload failed");
      setIsUploading(false);
      return;
    }
    setSlipPath(objectPath);
    setError(null);
    setIsUploading(false);
  };

  const submitPayment = async () => {
    if (!slipPath || !orderId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/public/pay/${orderId}/submit?t=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slipImagePath: slipPath }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSubmitted(true);
      setSubmitMsg(data.message ?? "Payment submitted. Thank you!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <Loader2 className="w-8 h-8 animate-spin text-stone-600" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stone-100">
        <div className="max-w-md text-center space-y-3 bg-white rounded-2xl p-8 shadow">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="font-semibold">Payment unavailable</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const fmt = (n: number) => formatMoney(n, info.currency);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 to-stone-200 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Pay by bank transfer</p>
          <h1 className="text-2xl font-bold mt-1">{info.outletName}</h1>
          <p className="text-sm text-stone-600 mt-1">{info.tableName} · {info.receiptRef}</p>
        </header>

        <div className="bg-stone-900 text-white rounded-2xl p-6 text-center shadow-lg">
          <p className="text-xs uppercase tracking-widest opacity-70">Amount to transfer</p>
          <p className="text-4xl font-bold mt-2">{fmt(info.amountDue)}</p>
          {info.paidSoFar > 0 && (
            <p className="text-xs mt-2 opacity-70">Total {fmt(info.orderTotal)} · Paid {fmt(info.paidSoFar)}</p>
          )}
        </div>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <p className="font-semibold text-green-900">{submitMsg}</p>
          </div>
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-sm">
              <h2 className="font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Bank account details
              </h2>
              <div className="space-y-3 text-sm">
                {[
                  ["Bank", info.bank.bankName],
                  ["Account name", info.bank.bankAccountName],
                  ["Account number", info.bank.bankAccountNumber],
                  ["Branch", info.bank.bankBranch],
                ]
                  .filter(([, v]) => v?.trim())
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 items-start">
                      <span className="text-stone-500 shrink-0">{label}</span>
                      <div className="flex items-center gap-2 text-right">
                        <span className="font-medium break-all">{value}</span>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-stone-100"
                          onClick={() => copyText(label, value!)}
                          aria-label={`Copy ${label}`}
                        >
                          {copied === label ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-stone-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              {info.bank.bankTransferNote?.trim() && (
                <p className="text-xs text-stone-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  {info.bank.bankTransferNote}
                </p>
              )}
              <p className="text-xs text-stone-500">
                Use reference: <strong>{info.receiptRef}</strong> when transferring.
              </p>
            </section>

            <section className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-sm">
              <h2 className="font-semibold">Upload transfer slip</h2>
              <p className="text-sm text-stone-600">
                Attach a screenshot or photo of your bank transfer confirmation.
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Choose file
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => cameraRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-2" /> Take photo
                </Button>
              </div>

              {slipPreview && (
                <div className="rounded-lg border overflow-hidden bg-stone-50">
                  <img src={slipPreview} alt="Transfer slip preview" className="w-full max-h-48 object-contain" />
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                className="w-full"
                size="lg"
                disabled={!slipPath || isUploading || loading}
                onClick={submitPayment}
              >
                {isUploading || loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Submit payment
              </Button>
            </section>
          </>
        )}

        <p className="text-center text-xs text-stone-500">
          Cash and card are not accepted online. Bank transfer only.
          {info.outletPhone ? ` · Questions: ${info.outletPhone}` : ""}
        </p>
      </div>
    </div>
  );
}
