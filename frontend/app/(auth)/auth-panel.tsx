"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { login, requestRegisterOtp } from "@/lib/actions/auth";
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
 * part of the product the team asked to keep.
 */
export function AuthPanel({ returnTo }: { returnTo?: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="flex min-h-dvh w-full flex-col bg-gradient-to-b from-white to-page">
      <div className="flex w-full flex-1 flex-col md:flex-row">
        <div className="relative hidden basis-1/2 flex-col justify-center p-16 text-white md:flex">
          {/* Half the viewport from md: up, and hidden below it — without
              `sizes`, next/image assumes 100vw and ships a full-width file. */}
          <Image
            src="/images/auth-hero.png"
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 0px"
            className="object-cover"
            priority
          />
          {/* The image is supporting context, so the copy sits on a stable
              dark scrim rather than inheriting contrast from the photograph. */}
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex flex-col gap-6">
            <h1 className="text-[2.375rem] leading-[1.15] font-bold tracking-[-0.02em] lg:text-[3rem]">
              A marketplace and item vault
              <br />
              for <span className="text-[var(--auth-accent)]">Kasetsart</span>
              <br />
              students
            </h1>
            <p className="max-w-xl text-body-lg text-white">
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

          {mode === "login" ? <LoginForm returnTo={returnTo} /> : <RegisterForm />}
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
        "flex h-12 flex-1 items-center justify-center rounded-pill text-body-lg",
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

function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, formAction, isPending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-6">
      <input type="hidden" name="returnTo" value={returnTo ?? ""} />
      <TextInput
        name="email"
        label="KU email"
        type="email"
        autoComplete="username"
        isRequired
        placeholder={`username@${ALLOWED_EMAIL_DOMAINS[0]}`}
        icon={<Mail className="size-5" />}
        inputClassName="h-14 text-body-lg"
      />

      <TextInput
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        isRequired
        placeholder="········"
        icon={<Lock className="size-5" />}
        inputClassName="h-14 text-body-lg"
      />

      {state?.error ? (
        <p role="alert" className="text-center text-body-sm text-tone-danger-fg">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block pill isLoading={isPending}>
        Login
        <ArrowRight className="size-5" />
      </Button>

      <Link
        href="/forgot"
        className="text-center text-body-sm text-ink-muted hover:text-ink"
      >
        Forgot your password?
      </Link>

      <Terms />
    </form>
  );
}

/**
 * Email and password, in one step.
 *
 * `flow4.png` originally ordered signup as email first, code second, password
 * and profile last. The real backend does not allow that split: password is a
 * required field on `POST /auth/register` itself, sent before any code exists.
 * Thai name and phone are collected later via `/account/edit` (`PATCH
 * /users/me`) instead of at signup — nothing there needs them upfront.
 *
 * The identity is the KU email rather than a free username, because the code is
 * emailed and the `@ku.th` domain is the whole trust model (research T1).
 */
function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    requestRegisterOtp,
    undefined,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // The domain error waits for blur or a submit attempt, so it does not
  // flash red on every keystroke while the address is still being typed.
  const [emailTouched, setEmailTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const emailOk = isKuEmail(email);
  const passwordOk = isPasswordValid(password);
  const rules = checkPassword(password);
  const canSubmit = emailOk && passwordOk;
  const showEmailError =
    !emailOk && (attempted || (emailTouched && email.trim() !== ""));

  return (
    <form
      action={formAction}
      // The browser's own checks (the "@" tooltip) would run before onSubmit
      // and say something different from the field errors below.
      noValidate
      // The button used to be disabled until both fields passed, which left a
      // non-KU address with no explanation at all (audit F05): a disabled
      // button cannot be pressed, so nothing could say why. It stays
      // pressable and the submit is stopped here instead, with the reason on
      // the field that needs fixing.
      onSubmit={(event) => {
        if (canSubmit) return;
        event.preventDefault();
        setAttempted(true);
        const field = event.currentTarget.elements.namedItem(emailOk ? "password" : "email");
        if (field instanceof HTMLInputElement) field.focus();
      }}
      className="flex w-full max-w-lg flex-col gap-6"
    >
      <TextInput
        name="email"
        label="KU email"
        type="email"
        value={email}
        onChange={setEmail}
        onBlur={() => setEmailTouched(true)}
        isRequired
        // The rule above decides; the browser's own "@" check would pop a
        // tooltip in its place.
        validationBehavior="aria"
        placeholder={`username@${ALLOWED_EMAIL_DOMAINS[0]}`}
        icon={<Mail className="size-5" />}
        inputClassName="h-14 text-body-lg"
        isInvalid={showEmailError}
        errorMessage={
          showEmailError
            ? "Use your Kasetsart University email (@ku.th or @ku.ac.th)."
            : undefined
        }
      />

      <div className="flex flex-col gap-2">
        <TextInput
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          isRequired
          placeholder="········"
          icon={<Lock className="size-5" />}
          inputClassName="h-14 text-body-lg"
          isInvalid={attempted && !passwordOk}
          errorMessage={
            attempted && !passwordOk ? "The password does not meet the rules below." : undefined
          }
        />
        <ul className="flex flex-col gap-1">
          <PasswordRule
            ok={rules.longEnough && rules.shortEnough}
            label={`${PASSWORD_RULES.minLength}–${PASSWORD_RULES.maxLength} characters`}
          />
          <PasswordRule ok={rules.hasLetter} label="At least one letter" />
          <PasswordRule ok={rules.hasDigit} label="At least one number" />
        </ul>
      </div>

      {state?.error ? (
        <p role="alert" className="text-center text-body-sm text-tone-danger-fg">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        block
        pill
        isLoading={isPending}
      >
        Send me the code
        <ArrowRight className="size-5" />
      </Button>

      <p className="text-center text-body-sm text-ink-muted">
        We will email you a 6-digit code, valid for {OTP_TTL_MINUTES} minutes.
      </p>

      <Terms />
    </form>
  );
}

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
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

function Terms() {
  return (
    <p className="text-center text-body-sm text-ink-muted">
      By continuing, you agree to the{" "}
      {/* TODO: link to a real terms page once the legal copy exists. */}
      <span className="font-medium text-ink-brand">KU Marketplace Terms</span>.
    </p>
  );
}
