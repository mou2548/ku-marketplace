"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Lock, Mail, X } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/field";
import { OtpInput } from "@/components/kit/otp-input";
import { forgotPassword, resetPassword } from "@/lib/actions/auth";
import {
  PASSWORD_RULES,
  checkPassword,
  isKuEmail,
  isPasswordValid,
} from "@/lib/auth-rules";
import { cn } from "@/lib/utils";

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 text-meta",
        ok ? "text-ink-brand" : "text-ink-muted",
      )}
    >
      {ok ? (
        <Check aria-hidden className="size-3.5" />
      ) : (
        <X aria-hidden className="size-3.5" />
      )}
      {label}
    </li>
  );
}

/**
 * `POST /auth/password/forgot` always "succeeds" — same message whether or
 * not the email is registered (anti-enumeration) — so success here just
 * means the request went through, not that a code was necessarily sent.
 * Redirects to `/reset?email=...` on success (see `lib/actions/auth.ts`).
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, formAction, isPending] = useActionState(forgotPassword, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TextInput
        name="email"
        label="University email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="yourname@ku.th"
        icon={<Mail className="size-5" />}
      />

      {state?.error ? (
        <p role="alert" className="text-caption font-medium text-tone-danger-fg">
          {state.error}
        </p>
      ) : null}

      <Button block isDisabled={!isKuEmail(email)} isLoading={isPending} type="submit">
        Send reset code
      </Button>
    </form>
  );
}

/**
 * The real backend has no magic-link token — `POST /auth/password/reset`
 * takes `{ email, otp, newPassword }`, the same 6-digit-code shape as
 * registration (`otp.service.ts`'s `password-reset:otp:*` namespace, same
 * 10-minute TTL). This form asks for the code directly rather than reading a
 * token out of the URL.
 */
export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, formAction, isPending] = useActionState(resetPassword, undefined);

  const rules = checkPassword(password);
  const matches = password !== "" && password === confirm;
  const canSubmit = otp.length === 6 && isPasswordValid(password) && matches;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="otp" value={otp} />

      <div className="flex flex-col gap-1.5 rounded-card bg-surface-sunken p-4 shadow-sunken">
        <span className="text-meta font-semibold text-ink-secondary">
          Resetting the password for
        </span>
        <span className="text-body font-semibold text-ink">
          {email || "no email given — go back and request a code"}
        </span>
      </div>

      <OtpInput value={otp} onChange={setOtp} label="Reset code" autoFocus />

      <div className="flex flex-col gap-2">
        <TextInput
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          icon={<Lock className="size-5" />}
        />
        <ul className="flex flex-col gap-1">
          <Rule
            ok={rules.longEnough && rules.shortEnough}
            label={`${PASSWORD_RULES.minLength}–${PASSWORD_RULES.maxLength} characters`}
          />
          <Rule ok={rules.hasLetter} label="At least one letter" />
          <Rule ok={rules.hasDigit} label="At least one number" />
        </ul>
      </div>

      <TextInput
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        icon={<Lock className="size-5" />}
        errorMessage={
          confirm !== "" && !matches ? "Passwords do not match" : undefined
        }
      />

      {state?.error ? (
        <p role="alert" className="text-caption font-medium text-tone-danger-fg">
          {state.error}
        </p>
      ) : null}

      <Button block isDisabled={!email || !canSubmit} isLoading={isPending} type="submit">
        Save new password
      </Button>

      <Link
        href="/login"
        className="text-center text-body-sm text-ink-muted hover:text-ink"
      >
        Back to sign in
      </Link>
    </form>
  );
}
