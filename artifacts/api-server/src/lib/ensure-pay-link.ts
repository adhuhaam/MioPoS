import { eq, sum } from "drizzle-orm";
import { db, ordersTable, paymentsTable, outletsTable } from "@workspace/db";
import { generatePayToken } from "./pay-token";
import { hasConfiguredBankTransfer } from "./bank-details";

export async function ensureOrderPayLink(orderId: number) {
  const order = await db.query.ordersTable.findFirst({ where: eq(ordersTable.id, orderId) });
  if (!order) return { error: "not_found" as const };

  const outlet = await db.query.outletsTable.findFirst({ where: eq(outletsTable.id, order.outletId) });
  if (!outlet) return { error: "not_found" as const };

  if (!hasConfiguredBankTransfer(outlet)) {
    return { error: "bank_not_configured" as const, outlet };
  }

  if (order.status === "paid" || order.status === "cancelled") {
    return { error: "not_payable" as const, status: order.status };
  }

  const [{ totalPaid }] = await db
    .select({ totalPaid: sum(paymentsTable.amount) })
    .from(paymentsTable)
    .where(eq(paymentsTable.orderId, orderId));

  const paidSoFar = parseFloat(totalPaid ?? "0");
  const orderTotal = parseFloat(order.total);
  const amountDue = Math.max(0, Math.round((orderTotal - paidSoFar) * 100) / 100);

  if (amountDue <= 0) {
    return { error: "nothing_due" as const };
  }

  let payToken = order.payToken;
  if (!payToken) {
    payToken = generatePayToken();
    await db.update(ordersTable).set({ payToken }).where(eq(ordersTable.id, orderId));
  }

  return {
    orderId: order.id,
    payToken,
    amountDue,
    orderTotal,
    paidSoFar,
    status: order.status,
  };
}
