"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({
  initialPhone,
  next,
}: {
  initialPhone: string | null;
  next: string;
}) {
  const t = useTranslations("auth");
  const initialState: LoginState = initialPhone
    ? { step: "pin", phone: initialPhone }
    : { step: "phone", phone: "" };
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex w-full max-w-sm flex-col gap-4 rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-6"
    >
      <input type="hidden" name="next" value={next} />
      {state.step !== "phone" && (
        <input type="hidden" name="phone" value={state.phone} />
      )}

      <h1 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h1>

      {state.step === "phone" && (
        <>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("phoneLabel")}
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoFocus
              placeholder={t("phonePlaceholder")}
              defaultValue={state.phone}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] tabular-nums text-[#14171A] outline-none focus:border-[#8B949C]"
            />
          </label>
          <button
            type="submit"
            name="intent"
            value="request-otp"
            disabled={pending}
            className="h-10 rounded-md bg-[#1B6BB8] font-semibold text-white disabled:opacity-60"
          >
            {pending ? t("sending") : t("sendOtp")}
          </button>
        </>
      )}

      {state.step === "otp" && (
        <>
          <p className="text-sm text-[#4A5057]">
            {t("otpSentTo", { phone: state.phone })}
          </p>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("otpLabel")}
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder={t("otpPlaceholder")}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] tabular-nums text-[#14171A] outline-none focus:border-[#8B949C]"
            />
          </label>
          <button
            type="submit"
            name="intent"
            value="verify-otp"
            disabled={pending}
            className="h-10 rounded-md bg-[#1B6BB8] font-semibold text-white disabled:opacity-60"
          >
            {pending ? t("verifying") : t("verifyAndSignIn")}
          </button>
        </>
      )}

      {state.step === "pin" && (
        <>
          <p className="text-sm tabular-nums text-[#4A5057]">{state.phone}</p>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            {t("pinLabel")}
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={4}
              placeholder={t("pinPlaceholder")}
              className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] tabular-nums text-[#14171A] outline-none focus:border-[#8B949C]"
            />
          </label>
          <button
            type="submit"
            name="intent"
            value="verify-pin"
            disabled={pending}
            className="h-10 rounded-md bg-[#1B6BB8] font-semibold text-white disabled:opacity-60"
          >
            {pending ? t("signingIn") : t("signIn")}
          </button>
          <button
            type="submit"
            name="intent"
            value="switch-to-otp"
            disabled={pending}
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] font-semibold text-[#14171A] disabled:opacity-60"
          >
            {t("useOtpInstead")}
          </button>
        </>
      )}

      {state.error && (
        <p className="text-sm text-[#C03028]" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
