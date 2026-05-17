import { CURRENCY_OPTIONS } from "../lib/currency";

type Props = {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  className?: string;
};

export function CurrencySelect({ value, onChange, id, className }: Props) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? "w-full mt-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"}
    >
      {CURRENCY_OPTIONS.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
      {!CURRENCY_OPTIONS.some((c) => c.code === value) && value ? (
        <option value={value}>{value}</option>
      ) : null}
    </select>
  );
}
