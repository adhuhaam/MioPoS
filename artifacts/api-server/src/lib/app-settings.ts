import { eq } from "drizzle-orm";
import { appSettingsTable, db } from "@workspace/db";

export const SETTINGS_KEYS = {
  defaultCurrency: "default_currency",
} as const;

export async function getAppSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettingsTable.findFirst({
    where: eq(appSettingsTable.key, key),
  });
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<string> {
  const [row] = await db
    .insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value, updatedAt: new Date() },
    })
    .returning();
  return row.value;
}

export async function getDefaultCurrency(): Promise<string> {
  return (await getAppSetting(SETTINGS_KEYS.defaultCurrency)) ?? "MVR";
}
