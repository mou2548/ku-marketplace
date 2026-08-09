"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Lock, Phone, User, X } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import {
  PASSWORD_RULES,
  PHONE_IS_OPTIONAL,
  checkPassword,
  derivedFirstName,
  isPasswordValid,
} from "@/lib/auth-rules";
import { cn } from "@/lib/utils";

/**
 * The last step of signup, and the reason the first step is one field.
 *
 * `flow4.png`: register with a KU email, the system sends a one-time code,
 * **then** "user: ตั้งรหัสผ่าน และข้อมูล profile", and only then is the account
 * opened. The password used to be collected on the register form, before the
 * address had been proved to belong to anyone.
 *
 * The English first name is derived and locked (§1.3 — it is the
 * anti-impersonation anchor); the Thai name and the phone are the parts a
 * student owns, and they are the same fields `/account/edit` maintains later.
 */
function DetailsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "student.name@ku.th";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [firstNameTh, setFirstNameTh] = useState("");
  const [lastNameTh, setLastNameTh] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const rules = checkPassword(password);
  const passwordsMatch = password !== "" && password === confirm;
  const canSubmit =
    isPasswordValid(password) &&
    passwordsMatch &&
    firstNameTh.trim().length > 0 &&
    lastNameTh.trim().length > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    // TODO: POST /auth/register/complete — sets the password and opens the account.
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    router.push("/");
  }

  return (
    <Surface
      shape="panel"
      elevation="floating"
      className="flex w-full max-w-md flex-col items-center gap-6 p-8 sm:p-10"
    >
      <Image
        src="/images/ku-logo.png"
        alt="Kasetsart University"
        width={72}
        height={85}
        priority
      />

      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-[1.25rem] leading-[1.3] font-bold">
          Set a password and finish your profile
        </h1>
        <p className="text-[0.875rem] leading-[1.65] text-ink-muted">
          Your email is verified. This is the last step.
        </p>
      </div>

      {/* Locked identity, restated where the editable names are entered so the
          difference between the two is obvious. */}
      <div className="flex w-full flex-col gap-1.5 rounded-card bg-surface-sunken p-4 shadow-sunken">
        <span className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-ink-secondary">
          <Lock aria-hidden className="size-3.5" />
          Locked to {email}
        </span>
        <span className="text-[1.125rem] font-semibold text-ink-brand">
          {derivedFirstName(email)}
        </span>
      </div>

      <form onSubmit={submit} className="flex w-full flex-col gap-5">
        <div className="flex flex-col gap-2">
          <TextInput
            label="Password"
            type="password"
            autoComplete="new-password"
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
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          placeholder="········"
          icon={<Lock className="size-5" />}
          inputClassName="h-14 text-[1.0625rem]"
          errorMessage={
            confirm !== "" && !passwordsMatch ? "Passwords do not match" : undefined
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="First name (Thai)"
            value={firstNameTh}
            onChange={setFirstNameTh}
            isRequired
            icon={<User className="size-4" />}
            placeholder="ปลาย"
          />
          <TextInput
            label="Last name (Thai)"
            value={lastNameTh}
            onChange={setLastNameTh}
            isRequired
            placeholder="ศรีสุข"
          />
        </div>

        <TextInput
          label="Phone number"
          type="tel"
          value={phone}
          onChange={(v) => setPhone(v.replace(/[^\d-]/g, ""))}
          inputMode="tel"
          icon={<Phone className="size-4" />}
          placeholder="08x-xxx-xxxx"
          hint={
            PHONE_IS_OPTIONAL
              ? "Optional. It is never verified by SMS, and it is only shown to someone you are already dealing with."
              : undefined
          }
        />

        <Button
          type="submit"
          size="lg"
          block
          pill
          isDisabled={!canSubmit}
          isLoading={busy}
        >
          Open my account
        </Button>
      </form>
    </Surface>
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

export default function RegisterDetailsPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-white to-page p-4">
      <Suspense fallback={null}>
        <DetailsForm />
      </Suspense>
    </div>
  );
}
