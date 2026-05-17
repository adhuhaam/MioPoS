import { eq, and, ilike } from "drizzle-orm";
import { db, customersTable, type Customer } from "@workspace/db";

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim();
}

function resolveDisplayName(customerName?: string | null, customerPhone?: string | null): string | null {
  const name = customerName?.trim();
  if (name) return name;
  const phone = customerPhone?.trim();
  if (phone) return phone;
  return null;
}

/** Create or update a customer record from takeaway order contact fields. */
export async function upsertCustomerFromTakeaway(params: {
  outletId: number;
  customerName?: string | null;
  customerPhone?: string | null;
}): Promise<void> {
  const displayName = resolveDisplayName(params.customerName, params.customerPhone);
  if (!displayName) return;

  const phone = params.customerPhone?.trim() || null;
  const phoneNorm = phone ? normalizePhone(phone) : null;

  let existing: Customer | undefined;

  if (phoneNorm) {
    const withPhone = await db
      .select()
      .from(customersTable)
      .where(and(eq(customersTable.outletId, params.outletId)));
    existing = withPhone.find((c: Customer) => c.phone && normalizePhone(c.phone) === phoneNorm);
  }

  if (!existing) {
    const byName = await db
      .select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.outletId, params.outletId),
          ilike(customersTable.name, displayName),
        ),
      )
      .limit(1);
    existing = byName[0];
  }

  const nameFromOrder = params.customerName?.trim();

  if (existing) {
    const updates: Record<string, string> = {};
    if (nameFromOrder && nameFromOrder !== existing.name) updates.name = nameFromOrder;
    if (phone && phone !== existing.phone) updates.phone = phone;
    if (Object.keys(updates).length === 0) return;
    await db.update(customersTable).set(updates).where(eq(customersTable.id, existing.id));
    return;
  }

  await db.insert(customersTable).values({
    outletId: params.outletId,
    name: displayName,
    phone,
    email: null,
    notes: null,
    creditBalance: "0",
  });
}
