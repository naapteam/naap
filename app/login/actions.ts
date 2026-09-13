"use server";

import { redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/guard";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { verifyPin } from "@/lib/auth/pin";
import { createSession, rememberPhone } from "@/lib/auth/session";
import { writeAudit } from "@/lib/auth/audit";
import type { Role } from "@/lib/auth/permissions";
import type { appUser } from "@/lib/db/schema";

export type LoginState = {
  step: "phone" | "otp" | "pin";
  phone: string;
  error?: string;
};

function messageFor(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  console.error("[login] unexpected error:", err);
  return "Something went wrong.";
}

async function finishLogin(user: typeof appUser.$inferSelect, phone: string) {
  await createSession({
    userId: user.id,
    orgId: user.orgId,
    millId: user.millId,
    role: user.role as Role,
    name: user.name,
    locale: user.locale,
  });
  await rememberPhone(phone);
  // audit_log.mill_id is NOT NULL — an org-level user (mill_id IS NULL) has
  // no single mill to attribute a login to, so it's skipped for them; every
  // mill-scoped action they take afterward carries its own mill_id anyway.
  if (user.millId) {
    await writeAudit({
      millId: user.millId,
      actorId: user.id,
      actorRole: user.role as Role,
      action: "login",
      entityTable: "app_user",
      entityId: user.id,
    });
  }
}

export async function loginAction(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const intent = String(formData.get("intent") ?? "");
  const nextPath = String(formData.get("next") ?? "/") || "/";

  if (intent === "request-otp") {
    const phone = String(formData.get("phone") ?? "").trim();
    if (!/^\d{10}$/.test(phone)) {
      return { step: "phone", phone, error: "Enter a 10-digit phone number." };
    }
    try {
      await requestOtp(phone);
    } catch (err) {
      return { step: "phone", phone, error: messageFor(err) };
    }
    return { step: "otp", phone };
  }

  if (intent === "switch-to-otp") {
    const phone = prevState.phone;
    try {
      await requestOtp(phone);
    } catch (err) {
      return { ...prevState, error: messageFor(err) };
    }
    return { step: "otp", phone };
  }

  if (intent === "verify-otp") {
    const phone = String(formData.get("phone") ?? prevState.phone);
    const code = String(formData.get("code") ?? "").trim();
    let user: typeof appUser.$inferSelect;
    try {
      user = await verifyOtp(phone, code);
    } catch (err) {
      return { step: "otp", phone, error: messageFor(err) };
    }
    await finishLogin(user, phone);
    redirect(nextPath);
  }

  if (intent === "verify-pin") {
    const phone = String(formData.get("phone") ?? prevState.phone);
    const pin = String(formData.get("pin") ?? "").trim();
    let user: typeof appUser.$inferSelect;
    try {
      user = await verifyPin(phone, pin);
    } catch (err) {
      return { step: "pin", phone, error: messageFor(err) };
    }
    await finishLogin(user, phone);
    redirect(nextPath);
  }

  return prevState;
}
