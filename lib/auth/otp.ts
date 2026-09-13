import "server-only";
import bcrypt from "bcryptjs";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appUser, otpCode } from "@/lib/db/schema";
import { AuthError } from "./guard";

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  // 6-digit code, zero-padded.
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (!process.env.SMS_API_KEY) {
    // Dev fallback — no SMS provider wired up yet.
    console.log(`[dev] OTP for ${phone}: ${code}`);
    return;
  }
  // Real SMS delivery is out of scope for v1 — wire a provider here when
  // the pilot needs it.
  console.warn("SMS_API_KEY is set but no SMS provider is implemented.");
  console.log(`[dev] OTP for ${phone}: ${code}`);
}

export async function requestOtp(phone: string): Promise<void> {
  const user = await db.query.appUser.findFirst({
    where: and(eq(appUser.phone, phone), eq(appUser.active, true)),
  });
  if (!user) {
    throw new AuthError(
      "No account found for this phone number. Ask the owner to add you as a user.",
    );
  }

  const recent = await db
    .select()
    .from(otpCode)
    .where(and(eq(otpCode.phone, phone), isNull(otpCode.consumedAt)))
    .orderBy(desc(otpCode.createdAt))
    .limit(1);
  const last = recent[0];
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new AuthError("An OTP was just sent. Wait a moment before retrying.");
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  await db.insert(otpCode).values({
    phone,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  await sendOtpSms(phone, code);
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<typeof appUser.$inferSelect> {
  const rows = await db
    .select()
    .from(otpCode)
    .where(
      and(
        eq(otpCode.phone, phone),
        isNull(otpCode.consumedAt),
        gt(otpCode.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpCode.createdAt))
    .limit(1);
  const pending = rows[0];
  if (!pending) {
    throw new AuthError("OTP expired or not requested. Request a new one.");
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    throw new AuthError("Too many attempts. Request a new OTP.");
  }

  const match = await bcrypt.compare(code, pending.codeHash);
  if (!match) {
    await db
      .update(otpCode)
      .set({ attempts: pending.attempts + 1 })
      .where(eq(otpCode.id, pending.id));
    throw new AuthError("Incorrect OTP.");
  }

  await db
    .update(otpCode)
    .set({ consumedAt: new Date() })
    .where(eq(otpCode.id, pending.id));

  const user = await db.query.appUser.findFirst({
    where: and(eq(appUser.phone, phone), eq(appUser.active, true)),
  });
  if (!user) {
    throw new AuthError("Account no longer active.");
  }
  return user;
}
