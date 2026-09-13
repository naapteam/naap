import "server-only";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appUser } from "@/lib/db/schema";
import { AuthError } from "./guard";

/**
 * Fast re-entry for a device that has already completed OTP login once
 * (architecture §2: "4-digit PIN for quick re-entry"). Not a first-time
 * login method — a user with no pin_hash set must use OTP.
 */
export async function verifyPin(
  phone: string,
  pin: string,
): Promise<typeof appUser.$inferSelect> {
  const user = await db.query.appUser.findFirst({
    where: and(eq(appUser.phone, phone), eq(appUser.active, true)),
  });
  if (!user || !user.pinHash) {
    throw new AuthError("PIN not set up for this phone. Sign in with OTP.");
  }
  const match = await bcrypt.compare(pin, user.pinHash);
  if (!match) {
    throw new AuthError("Incorrect PIN.");
  }
  return user;
}

export async function setPin(userId: string, pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) {
    throw new AuthError("PIN must be exactly 4 digits.");
  }
  const pinHash = await bcrypt.hash(pin, 10);
  await db.update(appUser).set({ pinHash }).where(eq(appUser.id, userId));
}
