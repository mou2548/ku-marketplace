"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/field";
import {
  ALLOWED_EMAIL_DOMAINS,
  OTP_TTL_MINUTES,
  isKuEmail,
} from "@/lib/auth-rules";
import { login } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/**
 * Sign in and register, on one panel and one route.
 *
 * Registering used to be a separate long page reached through a tab that was
 * really a link. It is three fields, so it belongs here beside the sign-in
 * form — and now it is here in the literal sense too: the tabs are state, not
 * navigation. Two URLs rendering the same shell meant a full navigation, a
 * re-fetch, and a flash of the hero image to move between two forms sitting
 * side by side. `/register` redirects here, so links that were already sent
 * still land in the right place.
 *
 * The visual design of this screen is deliberately unchanged — it is the one
 * part of the product the team asked to keep (docs/PLAN.md §3).
 */
export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");

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

          <div
            role="group"
            aria-label="Sign in or register"
            className="flex w-full max-w-lg rounded-pill bg-surface-sunken p-1 shadow-sunken"
          >
            <ModeTab
              label="Login"
              isActive={mode === "login"}
              onPress={() => setMode("login")}
            />
            <ModeTab
              label="Register"
              isActive={mode === "register"}
              onPress={() => setMode("register")}
            />
          </div>

          {mode === "login" ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={isActive}
      className={cn(
        "flex h-12 flex-1 items-center justify-center rounded-pill text-[1.0625rem]",
        "transition-colors duration-[--dur-fast]",
        isActive
          ? "bg-surface font-semibold text-ink shadow-raised"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-6">
      {/* Not `type="email"`: the browser refuses to submit anything without an
          `@` in it, which silently blocked every non-email account — including
          the development one. The server decides what is valid, not the input
          type. */}
      <TextInput
        name="username"
        label="KU email"
        type="text"
        autoComplete="username"
        isRequired
        placeholder={`username@${ALLOWED_EMAIL_DOMAINS[0]}`}
        icon={<Mail className="size-5" />}
        inputClassName="h-14 text-[1.0625rem]"
      />

      <TextInput
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        isRequired
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
 * One field.
 *
 * `flow4.png` orders signup: enter a KU email, the system sends a one-time
 * code, **then** you set a password and fill in your profile, and only then is
 * the account opened. The form used to take the password here, before the
 * address had been proved to belong to anyone — so a full set of credentials
 * could be typed for an address the person did not hold.
 *
 * The identity is the KU email rather than a free username, because the code is
 * emailed and the `@ku.th` domain is the whole trust model (research T1).
 */
function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const emailOk = isKuEmail(email);
  const canSubmit = emailOk;

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
        placeholder={`username  @${ALLOWED_EMAIL_DOMAINS[0]}`}
        icon={<Mail className="size-5" />}
        inputClassName="h-14 text-[1.0625rem]"
        errorMessage={
          email !== "" && !emailOk
            ? `Only @${ALLOWED_EMAIL_DOMAINS.join(" and @")} addresses can register`
            : undefined
        }
      />

      <Button type="submit" size="lg" block pill isDisabled={!canSubmit}>
        Send me the code
        <ArrowRight className="size-5" />
      </Button>

      <p className="text-center text-[0.875rem] leading-[1.65] text-ink-muted">
        We will email you a 6-digit code, valid for {OTP_TTL_MINUTES} minutes.
        You pick a password and fill in your profile after that.
      </p>

      <Terms />
    </form>
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
