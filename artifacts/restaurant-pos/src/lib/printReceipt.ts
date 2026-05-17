import type { OrderDetail, OrderItem, ServiceType } from "@workspace/api-client-react";
import { orderPayQrImageUrl } from "./pay-url";

export type PrintReceiptOptions = {
  outletName: string;
  outletAddress?: string;
  outletPhone?: string;
  staffName?: string;
  currency?: string;
  fmt: (amount: number | string) => string;
  payUrl?: string | null;
  amountDue?: number;
  /** Base64 data URL for QR — preferred for printing */
  payQrDataUrl?: string | null;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtPlain(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatReceiptDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatReceiptTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function receiptNumber(orderId: number): string {
  return `RCP-${String(orderId).padStart(6, "0")}`;
}

function serviceTypeLabel(st: ServiceType | string | undefined): string {
  const map: Record<string, string> = {
    dine_in: "Dine in",
    takeaway: "Takeaway",
    delivery: "Delivery",
  };
  return map[st ?? ""] ?? "Order";
}

function splitAddress(address: string): string[] {
  return address
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function metaRow(label: string, value: string): string {
  return `<div class="row">
    <span class="lbl">${escapeHtml(label)}</span>
    <span class="val">${escapeHtml(value)}</span>
  </div>`;
}

function buildReceiptHtml(order: OrderDetail, opts: PrintReceiptOptions): string {
  const { outletName, outletAddress, outletPhone, staffName, currency, fmt, payUrl, amountDue, payQrDataUrl } = opts;
  const addressLines = outletAddress ? splitAddress(outletAddress) : [];
  const items = order.items ?? [];
  const rcptNo = receiptNumber(order.id);

  const itemRows =
    items.length > 0
      ? items
          .map((item: OrderItem, index: number) => {
            const mods = item.modifiers?.length
              ? `<div class="mods">${item.modifiers.map((m) => escapeHtml(m.name)).join(", ")}</div>`
              : "";
            const note = item.notes?.trim()
              ? `<div class="mods">Note: ${escapeHtml(item.notes.trim())}</div>`
              : "";
            return `<tr>
          <td>${index + 1}</td>
          <td class="item">${escapeHtml(item.menuItemName)}${mods}${note}</td>
          <td class="num">${Number(item.quantity).toFixed(2)}</td>
          <td class="num">${fmtPlain(item.unitPrice)}</td>
          <td class="num">${fmtPlain(item.total)}</td>
        </tr>`;
          })
          .join("")
      : `<tr><td colspan="5" class="empty">No items</td></tr>`;

  const meta: string[] = [
    metaRow("Receipt#", rcptNo),
    metaRow("Date", formatReceiptDate(order.createdAt)),
    metaRow("Time", formatReceiptTime(order.createdAt)),
    metaRow("Type", serviceTypeLabel(order.serviceType)),
    metaRow("Status", order.status.replace("_", " ")),
  ];
  if (order.serviceType === "dine_in" && order.tableName) meta.push(metaRow("Table", order.tableName));
  if (order.customerName?.trim()) meta.push(metaRow("Customer", order.customerName.trim()));
  if (order.customerPhone?.trim()) meta.push(metaRow("Phone", order.customerPhone.trim()));
  if (order.serviceType === "delivery" && order.deliveryAddress?.trim()) {
    meta.push(metaRow("Address", order.deliveryAddress.trim()));
  }
  if (staffName?.trim()) meta.push(metaRow("Served by", staffName.trim()));

  const discount = Number(order.discountAmount);
  const tax = Number(order.taxAmount);
  const timeFee = Number(order.timeFee);
  const discountPct = order.discountPercent ? Number(order.discountPercent) : 0;

  const totalRows: string[] = [
    `<tr class="tot"><td colspan="3"></td><td>Sub Total</td><td class="num">${fmtPlain(order.subtotal)}</td></tr>`,
  ];
  if (discount > 0) {
    const hint = discountPct > 0 ? ` (${discountPct}%)` : "";
    totalRows.push(
      `<tr class="tot"><td colspan="3"></td><td>Discount${hint}</td><td class="num">-${fmtPlain(discount)}</td></tr>`,
    );
  }
  if (tax > 0) {
    totalRows.push(
      `<tr class="tot"><td colspan="3"></td><td>Tax</td><td class="num">${fmtPlain(tax)}</td></tr>`,
    );
  }
  if (timeFee > 0) {
    totalRows.push(
      `<tr class="tot"><td colspan="3"></td><td>Room charge</td><td class="num">${fmtPlain(timeFee)}</td></tr>`,
    );
  }

  const payments = order.payments ?? [];
  const paymentsBlock =
    payments.length > 0
      ? `<div class="block">
          <p class="block-title">Payments</p>
          ${payments
            .map(
              (p) =>
                `<p class="pay-line"><span>${escapeHtml(p.method.replace(/_/g, " "))}</span><span>${fmt(p.amount)}</span></p>`,
            )
            .join("")}
        </div>`
      : "";

  const noteBlock = order.notes?.trim()
    ? `<p class="note"><strong>Note:</strong> ${escapeHtml(order.notes.trim())}</p>`
    : "";

  const qrSrc = payQrDataUrl ?? (payUrl ? orderPayQrImageUrl(payUrl, 160) : null);
  const showPayQr = qrSrc && (amountDue ?? 0) > 0 && order.status !== "paid";
  const payBlock = showPayQr
      ? `<div class="pay-qr">
          <p class="pay-title">Pay by bank transfer</p>
          <img src="${qrSrc}" width="140" height="140" alt="Scan to pay" />
          <p class="pay-amt">Amount due: ${fmt(amountDue ?? 0)}</p>
          <p class="pay-hint">Scan with your phone · transfer · upload slip</p>
          ${payUrl ? `<p class="pay-url">${escapeHtml(payUrl)}</p>` : ""}
        </div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${rcptNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      color: #111;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px 16px 28px;
    }
    .center { text-align: center; }
    .brand { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .muted { font-size: 11px; color: #444; line-height: 1.5; }
    hr { border: none; border-top: 1px solid #111; margin: 12px 0; }
    .title { text-align: center; font-size: 13px; font-weight: 700; letter-spacing: 0.15em; }
    .meta { margin: 4px 0; }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; font-size: 11px; }
    .lbl { color: #333; }
    .val { text-align: right; font-weight: 500; max-width: 60%; word-break: break-word; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
    th { text-align: left; font-weight: 600; padding: 6px 4px 8px; border-bottom: 1px solid #111; }
    th.num, td.num { text-align: right; }
    th:first-child, td:first-child { width: 6%; }
    td { padding: 6px 4px; vertical-align: top; border-bottom: 1px solid #e5e5e5; }
    td.item { width: 38%; }
    .mods { font-size: 10px; color: #666; margin-top: 2px; }
    tr.tot td { border-bottom: none; padding-top: 6px; }
    tr.tot td:nth-child(4) { text-align: right; font-weight: 500; padding-right: 8px; }
    .grand {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #111;
      font-size: 14px;
      font-weight: 700;
    }
    .grand-amt { font-size: 15px; }
    .block { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #ccc; }
    .block-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 6px; }
    .pay-line { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; text-transform: capitalize; }
    .note { margin-top: 10px; font-size: 11px; color: #333; }
    .pay-qr {
      margin-top: 14px;
      padding: 12px;
      text-align: center;
      border: 1px dashed #999;
    }
    .pay-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
    .pay-qr img { display: block; margin: 0 auto 6px; }
    .pay-amt { font-weight: 700; font-size: 13px; }
    .pay-hint { font-size: 10px; color: #666; margin-top: 4px; }
    .pay-url { font-size: 8px; color: #888; margin-top: 6px; word-break: break-all; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #555; }
    .empty { text-align: center; color: #888; padding: 16px !important; }
    @media print {
      body { max-width: none; padding: 0; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <header class="center">
    <p class="brand">${escapeHtml(outletName)}</p>
    ${addressLines.map((l) => `<p class="muted">${escapeHtml(l)}</p>`).join("")}
    ${outletPhone?.trim() ? `<p class="muted">${escapeHtml(outletPhone.trim())}</p>` : ""}
  </header>

  <hr />
  <p class="title">RECEIPT</p>
  <hr />

  <section class="meta">
    ${meta.join("")}
  </section>

  <hr />

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tfoot>${totalRows.join("")}</tfoot>
  </table>

  <div class="grand">
    <span>TOTAL${currency?.trim() ? ` (${escapeHtml(currency.trim().toUpperCase())})` : ""}</span>
    <span class="grand-amt">${fmt(order.total)}</span>
  </div>

  ${paymentsBlock}
  ${noteBlock}
  ${payBlock}

  <footer class="footer">
    <p>Thanks for your business.</p>
    <p style="margin-top:8px">${escapeHtml(rcptNo)} · Order #${order.id}</p>
  </footer>
</body>
</html>`;

  return html;
}

export async function printOrderReceipt(order: OrderDetail, opts: PrintReceiptOptions): Promise<boolean> {
  const html = buildReceiptHtml(order, opts);
  const win = window.open("", "_blank", "width=440,height=720");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  const waitMs = opts.payQrDataUrl || opts.payUrl ? 600 : 250;
  return new Promise((resolve) => {
    setTimeout(() => {
      win.print();
      win.onafterprint = () => win.close();
      resolve(true);
    }, waitMs);
  });
}
