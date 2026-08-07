"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lock, Mail, X } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/field";
import {
  ALLOWED_EMAIL_DOMAINS,
  OTP_TTL_MINUTES,
  PASSWORD_RULES,
  checkPassword,
  isKuEmail,
  isPasswordValid,
} from "@/lib/auth-rules";
import { login } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/**
 * Sign in and register, on one panel.
 *
 * Registering used to be a separate long page reached through a tab that was
 * really a link, so the tab lied about what it did. It is three fields, so it
 * belongs here beside the sign-in form.
 *
 * The tabs are links rather than local state on purpose: `/login` and
 * `/register` stay real URLs, so the browser back button works, a "sign up
 * here" link can be sent to someone, and the existing `/register` route keeps
 * working without a redirect.
 *
 * The visual design of this screen is deliberately unchanged — it is the one
 * part of the product the team asked to keep (docs/PLAN.md §3).
 */
export function AuthPanel({ mode }: { mode: "login" | "register" }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-gradient-to-b from-white to-page">
      <div className="flex w-full flex-1 flex-col md:flex-row">
        <div className="relative hidden basis-1/2 flex-col justify-center p-16 text-white md:flex">
          <Image
            src="/images/auth-hero.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative flex flex-col gap-6">
            <h1 className="text-[2.375rem] leading-[1.15] font-bold tracking-[-0.02em] lg:text-[3rem]">
              <span className="text-brand">
                A marketplace and item vault
                <br />
                for Kasetsart
              </span>
              <br />
              students
            </h1>
            <p className="max-w-xl text-[1.0625rem] leading-[1.75] text-white/80">
              The safest place to buy, sell, and trade inside the university.
              Every account is verified through the Nontri system, and everyone
              gets a personal item vault.
            </p>
          </div>
        </div>

        <div className="flex basis-1/2 flex-col items-center justify-center gap-8 bg-surface p-8 sm:p-16">
          <Image
            src="/images/ku-logo.png"
            alt="Kasetsart University"
            width={150}
            height={177}
            priority
          />

          <nav
            aria-label="Sign in or register"
            className="flex w-full max-w-lg rounded-pill bg-surface-sunken p-1 shadow-sunken"
          >
            <ModeTab href="/login" label="Login" isActive={mode === "login"} />
            <ModeTab
              href="/register"
              label="Register"
              isActive={mode === "register"}
            />
          </nav>

          {mode === "login" ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-12 flex-1 items-center justify-center rounded-pill text-[1.0625rem]",
        "transition-colors duration-[--dur-fast]",
        isActive
          ? "bg-surface font-semibold text-ink shadow-raised"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-6">
      <TextInput
        name="username"
        label="KU email"
        type="email"
        placeholder={`username@${ALLOWED_EMAIL_DOMAINS[0]}`}
        icon={<Mail className="size-5" />}
        inputClassName="h-14 text-[1.0625rem]"
      />

      <TextInput
        name="password"
        type="password"
        label="Password"
        placeholder="········"
        icon={<Lock className="size-5" />}
        inputClassName="h-14 text-[1.0625rem]"
      />

      {state?.error ? (
        <p role="alert" className="text-center text-[0.875rem] text-tone-danger-fg">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block pill isLoading={isPending}>
        Login
        <ArrowRight className="size-5" />
      </Button>

      <Link
        href="/forgot"
        className="text-center text-[0.875rem] text-ink-muted hover:text-ink"
      >
        Forgot your password?
      </Link>

      <Terms />
    </form>
  );
}

/**
 * Three fields. The phone number is gone — the schema has it nullable and no
 * flow depends on it, so asking for it at the door was cost with no return; it
 * can be added later from the profile.
 *
 * The single identity field is the KU email rather than a free username,
 * because the one-time code is emailed and the `@ku.th` domain is the whole
 * trust model (research T1). Naming it "KU email" is the honest label for what
 * it has to be.
 */
function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const emailOk = isKuEmail(email);
  const rules = checkPassword(password);
  const passwordsMatch = password !== "" && password === confirm;
  const canSubmit = emailOk && isPasswordValid(password) && passwordsMatch;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    // TODO: POST /auth/register; the server emails the one-time code.
    router.push(`/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-lg flex-col gap-6">
      <TextInput
        label="KU email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder={`username@${ALLOWED_EMAIL_DOMAINS[0]}`}
        icon={<Mail className="size-5" />}
        inputClassName="h-14 text-[1.0625rem]"
        errorMessage={
          email !== "" && !emailOk
            ? `Only @${ALLOWED_EMAIL_DOMAINS.join(" and @")} addresses can register`
            : undefined
        }
      />

      <div className="flex flex-col gap-2">
        <TextInput
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="········"
          icon={<Lock className="size-5" />}
          inputClassName="h-14 text-[1.0625rem]"
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
        label="Confirm password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        placeholder="········"
        icon={<Lock className="size-5" />}
        inputClassName="h-14 text-[1.0625rem]"
        errorMessage={
          confirm !== "" && !passwordsMatch ? "Passwords do not match" : undefined
        }
      />

      <Button type="submit" size="lg" block pill isDisabled={!canSubmit}>
        Register
        <ArrowRight className="size-5" />
      </Button>

      <p className="text-center text-[0.875rem] text-ink-muted">
        We will email you a 6-digit code, valid for {OTP_TTL_MINUTES} minutes.
      </p>

      <Terms />
    </form>
  );
}

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

function Terms() {
  return (
    <p className="text-center text-[0.875rem] text-ink-muted">
      By continuing, you agree to the{" "}
      {/* TODO: link to a real terms page once the legal copy exists. */}
      <span className="font-medium text-ink-brand">KU Marketplace Terms</span>.
    </p>
  );
}
