import crypto from "crypto";

export function generatePayToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function verifyPayToken(stored: string | null | undefined, provided: string | undefined): boolean {
  if (!stored || !provided) return false;
  if (stored.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(provided));
  } catch {
    return false;
  }
}
