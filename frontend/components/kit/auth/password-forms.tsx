"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Lock, Mail, X } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import {
  PASSWORD_RULES,
  RESET_LINK_TTL_MINUTES,
  checkPassword,
  isKuEmail,
  isPasswordValid,
} from "@/lib/auth-rules";
import { cn } from "@/lib/utils";

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 text-[0.75rem]",
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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Surface
        shape="card"
        elevation="flat"
        fill="sunken"
        className="flex flex-col gap-3 p-5 text-center"
      >
        <p className="text-[0.875rem] font-semibold">Link sent</p>
        {/* Deliberately does not confirm whether the address is registered —
            that would let anyone probe which students have accounts. */}
        <p className="text-[0.75rem] leading-[1.6] text-ink-muted">
          If an account exists for this email, a reset link is on its way. It is
          valid for {RESET_LINK_TTL_MINUTES} minutes.
        </p>
      </Surface>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <TextInput
        label="University email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="yourname@ku.th"
        icon={<Mail className="size-5" />}
      />

      {/* TODO: POST the request; the server issues the reset link. */}
      <Button
        block
        isDisabled={!isKuEmail(email)}
        onPress={() => setSent(true)}
      >
        Send reset link
      </Button>
    </div>
  );
}

/** The same password rules apply on reset as on registration. */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const rules = checkPassword(password);
  const matches = password !== "" && password === confirm;

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-card bg-brand-subtle px-4 py-3 text-center text-[0.875rem] text-ink-brand">
          Your password has been reset
        </p>
        <LinkButton href="/login" block pill>
          Sign in
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <TextInput
          label="New password"
          type="password"
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
        value={confirm}
        onChange={setConfirm}
        icon={<Lock className="size-5" />}
        errorMessage={
          confirm !== "" && !matches ? "Passwords do not match" : undefined
        }
      />

      {/* TODO: POST the new password with the token from the URL. */}
      <Button
        block
        isDisabled={!isPasswordValid(password) || !matches}
        onPress={() => setDone(true)}
      >
        Save new password
      </Button>

      <Link
        href="/login"
        className="text-center text-[0.875rem] text-ink-muted hover:text-ink"
      >
        Back to sign in
      </Link>
    </div>
  );
}
