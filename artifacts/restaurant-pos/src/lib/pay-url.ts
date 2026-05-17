/** Public customer bank-transfer page for an order */
export function buildOrderPayUrl(orderId: number, payToken: string): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${base}/pay/${orderId}?t=${encodeURIComponent(payToken)}`;
}

export function orderPayQrImageUrl(payUrl: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=M&data=${encodeURIComponent(payUrl)}`;
}

export type PayLinkInfo = {
  orderId: number;
  payToken: string;
  amountDue: number;
};

/** Resolve pay link from API (creates pay_token if missing). */
export async function fetchOrderPayLink(orderId: number): Promise<PayLinkInfo | null> {
  const res = await fetch(`/api/orders/${orderId}/pay-link`, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Could not load payment link");
  }
  const data = (await res.json()) as PayLinkInfo & { payToken?: string | null; reason?: string };
  if (!data.payToken || (data.amountDue ?? 0) <= 0) return null;
  return { orderId: data.orderId, payToken: data.payToken, amountDue: data.amountDue };
}

/** Embed QR in print HTML so it survives print dialog (external URLs often fail). */
export async function fetchPayQrDataUrl(payUrl: string, size = 160): Promise<string | null> {
  try {
    const res = await fetch(orderPayQrImageUrl(payUrl, size));
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
