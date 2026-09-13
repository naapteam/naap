import "server-only";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "./token";
import type { Role } from "./permissions";

export const SESSION_COOKIE = "naap_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days — device stays "known" for PIN re-entry

export type SessionPayload = {
  userId: string;
  orgId: string;
  millId: string | null; // null = org-level user, sees every mill
  role: Role;
  name: string;
  locale: string;
  iat: number;
  exp: number;
};

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

export async function createSession(
  user: Pick<
    SessionPayload,
    "userId" | "orgId" | "millId" | "role" | "name" | "locale"
  >,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...user,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const token = await signToken(payload, secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken<SessionPayload>(token, secret());
  if (!payload) return null;
  if (payload.exp * 1000 < Date.now()) return null;
  return payload;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Remembers the last phone used on this device, purely for the login form's
 * fast path (PIN instead of OTP). Not a credential — safe to be readable JS. */
export const LAST_PHONE_COOKIE = "naap_last_phone";

export async function rememberPhone(phone: string): Promise<void> {
  const store = await cookies();
  store.set(LAST_PHONE_COOKIE, phone, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getRememberedPhone(): Promise<string | null> {
  const store = await cookies();
  return store.get(LAST_PHONE_COOKIE)?.value ?? null;
}
