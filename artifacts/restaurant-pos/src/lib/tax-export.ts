import * as XLSX from "xlsx";

export type OutputTaxLine = {
  invoiceNumber: string;
  invoiceDate: string;
  serviceType: string;
  customerName: string | null;
  taxableAmount: number;
  gstAmount: number;
  timeFee: number;
  totalAmount: number;
  taxRate: number;
  paymentMethods: string[];
};

export type InputTaxLine = {
  lineNo: number;
  supplierName: string;
  supplierTin: string;
  invoiceDate: string;
  invoiceNumber: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  description: string | null;
};

function num(n: number): number {
  return Math.round(n * 100) / 100;
}

/** MIRA Output Tax Statement — sheet name must not be changed for portal upload. */
export function downloadOutputTaxExcel(params: {
  outletName: string;
  periodLabel: string;
  lines: OutputTaxLine[];
  totals: { taxableAmount: number; gstAmount: number; totalAmount: number };
  filename?: string;
}): void {
  const header = [
    ["Output Tax Statement"],
    [`Outlet: ${params.outletName}`],
    [`Period: ${params.periodLabel}`],
    [],
    [
      "No",
      "Tax Invoice / Receipt No",
      "Invoice Date",
      "Service Type",
      "Customer Name",
      "Value of Supply (excl. GST)",
      "GST Amount",
      "Time Fee",
      "Total Invoice Value",
      "GST Rate (%)",
      "Payment Method",
    ],
  ];

  const rows = params.lines.map((l, i) => [
    i + 1,
    l.invoiceNumber,
    l.invoiceDate,
    l.serviceType,
    l.customerName ?? "",
    num(l.taxableAmount),
    num(l.gstAmount),
    num(l.timeFee),
    num(l.totalAmount),
    l.taxRate,
    l.paymentMethods.join(", "),
  ]);

  const footer = [
    [],
    [
      "",
      "",
      "",
      "",
      "TOTAL",
      num(params.totals.taxableAmount),
      num(params.totals.gstAmount),
      "",
      num(params.totals.totalAmount),
      "",
      "",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...header, ...rows, ...footer]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Output Tax Statement");
  XLSX.writeFile(wb, params.filename ?? `output-tax-${params.periodLabel.replace(/\s+/g, "-")}.xlsx`);
}

/** MIRA Input Tax Statement — sheet name must not be changed for portal upload. */
export function downloadInputTaxExcel(params: {
  outletName: string;
  periodLabel: string;
  lines: InputTaxLine[];
  totals: { subtotal: number; gstAmount: number; total: number };
  filename?: string;
}): void {
  const header = [
    ["Input Tax Statement"],
    [`Outlet: ${params.outletName}`],
    [`Period: ${params.periodLabel}`],
    [],
    [
      "No",
      "Supplier Name",
      "Supplier TIN (13 digits)",
      "Invoice Date",
      "Invoice Number",
      "Bill Subtotal (excl. GST)",
      "GST Amount",
      "Total Invoice Value",
      "Description",
    ],
  ];

  const rows = params.lines.map((l) => [
    l.lineNo,
    l.supplierName,
    l.supplierTin,
    l.invoiceDate,
    l.invoiceNumber,
    num(l.subtotal),
    num(l.gstAmount),
    num(l.total),
    l.description ?? "",
  ]);

  const footer = [
    [],
    [
      "",
      "",
      "",
      "",
      "TOTAL",
      num(params.totals.subtotal),
      num(params.totals.gstAmount),
      num(params.totals.total),
      "",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...header, ...rows, ...footer]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Input Tax Statement");
  XLSX.writeFile(wb, params.filename ?? `input-tax-${params.periodLabel.replace(/\s+/g, "-")}.xlsx`);
}
