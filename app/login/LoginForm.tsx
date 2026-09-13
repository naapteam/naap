"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({
  initialPhone,
  next,
}: {
  initialPhone: string | null;
  next: string;
}) {
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

      <h1 className="text-[17px] font-semibold text-[#14171A]">
        Sign in to Naap
      </h1>

      {state.step === "phone" && (
        <>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            Phone number
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoFocus
              placeholder="10-digit number"
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
            {pending ? "Sending…" : "Send OTP"}
          </button>
        </>
      )}

      {state.step === "otp" && (
        <>
          <p className="text-sm text-[#4A5057]">
            Enter the OTP sent to {state.phone}.
          </p>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            OTP
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="6-digit code"
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
            {pending ? "Verifying…" : "Verify & sign in"}
          </button>
        </>
      )}

      {state.step === "pin" && (
        <>
          <p className="text-sm text-[#4A5057]">{state.phone}</p>
          <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
            PIN
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={4}
              placeholder="4-digit PIN"
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
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <button
            type="submit"
            name="intent"
            value="switch-to-otp"
            disabled={pending}
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] font-semibold text-[#14171A] disabled:opacity-60"
          >
            Use OTP instead
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
