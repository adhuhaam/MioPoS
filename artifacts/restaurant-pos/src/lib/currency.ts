/** Common ISO 4217 codes for outlet / system currency. */
export const CURRENCY_OPTIONS = [
  { code: "MVR", label: "Maldivian Rufiyaa (MVR)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "AED", label: "UAE Dirham (AED)" },
  { code: "INR", label: "Indian Rupee (INR)" },
  { code: "LKR", label: "Sri Lankan Rupee (LKR)" },
  { code: "SGD", label: "Singapore Dollar (SGD)" },
  { code: "THB", label: "Thai Baht (THB)" },
  { code: "MYR", label: "Malaysian Ringgit (MYR)" },
] as const;

export function formatMoney(amount: number | string, currencyCode: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  const code = (currencyCode || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${code} ${n.toFixed(2)}`;
  }
}

/** Resolve display currency: outlet override, else system default. */
export function resolveCurrency(outletCurrency: string | undefined | null, defaultCurrency: string): string {
  const outlet = outletCurrency?.trim();
  if (outlet && outlet.length >= 3) return outlet.toUpperCase();
  return (defaultCurrency || "MVR").toUpperCase();
}
