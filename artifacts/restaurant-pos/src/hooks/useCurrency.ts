import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { useAuth } from "../lib/auth";
import { formatMoney, resolveCurrency } from "../lib/currency";

type SystemSettings = { defaultCurrency: string };

async function fetchSystemSettings(): Promise<SystemSettings> {
  const res = await fetch("/api/settings/system", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load system settings");
  return res.json();
}

export function useCurrency() {
  const { auth } = useAuth();
  const outletId = auth?.outlet?.id ?? 0;
  const outletCurrency = auth?.outlet?.currency;

  const { data: system } = useQuery({
    queryKey: ["settings", "system"],
    queryFn: fetchSystemSettings,
    staleTime: 60_000,
  });

  const currency = useMemo(
    () => resolveCurrency(outletId > 0 ? outletCurrency : null, system?.defaultCurrency ?? outletCurrency ?? "MVR"),
    [outletId, outletCurrency, system?.defaultCurrency],
  );

  const fmt = useCallback((amount: number | string) => formatMoney(amount, currency), [currency]);

  return { currency, fmt, defaultCurrency: system?.defaultCurrency ?? "MVR" };
}
