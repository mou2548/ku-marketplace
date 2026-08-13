"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, RotateCcw } from "lucide-react";

import { Button } from "@/components/kit/button";
import { OtpInput } from "@/components/kit/otp-input";
import { Surface } from "@/components/kit/surface";
import { OTP_TTL_MINUTES, derivedFirstName } from "@/lib/auth-rules";

/**
 * The one-time code step.
 *
 * The mock code is 111111 while there is no backend to send a real one. It is a
 * constant with a name rather than a magic string, so the day the API arrives
 * the check is deleted rather than hunted for.
 *
 * The locked English name moved here from the registration form. It is derived
 * from the institutional email, so showing it before the email is verified was
 * asserting an identity nobody had proved yet. Here it reads as what it is:
 * this is who the university says you are, confirm and continue.
 */
const MOCK_OTP = "111111";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "student.name@ku.th";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    // TODO: POST /auth/otp/verify
    await new Promise((r) => setTimeout(r, 300));
    setBusy(false);

    if (otp !== MOCK_OTP) {
      setError("That code is not right. Check the email and try again.");
      setOtp("");
      return;
    }
    // flow4: the address is proved, so now the password and the profile.
    router.push(`/register/details?email=${encodeURIComponent(email)}`);
  }

  return (
    <Surface
      shape="panel"
      elevation="floating"
      className="flex w-full max-w-md flex-col items-center gap-6 p-10 text-center"
    >
      <Image
        src="/images/ku-logo.png"
        alt="Kasetsart University"
        width={72}
        height={85}
        priority
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-[1.25rem] leading-[1.3] font-bold">
          Verify your email
        </h1>
        <p className="text-[0.875rem] leading-[1.65] text-ink-muted">
          We sent a 6-digit code to
          <br />
          <span className="font-semibold text-ink">{email}</span>
        </p>
      </div>

      {/* Identity, confirmed at the moment it is proved rather than claimed. */}
      <div className="flex w-full flex-col gap-1.5 rounded-card bg-surface-sunken p-4 text-left shadow-sunken">
        <span className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-ink-secondary">
          <Lock aria-hidden className="size-3.5" />
          Your name on KU Marketplace
        </span>
        <span className="text-[1.125rem] font-semibold text-ink-brand">
          {derivedFirstName(email)}
        </span>
        <p className="text-[0.75rem] leading-[1.6] text-ink-muted">
          Taken from your institutional email and locked, because it is the
          anchor that stops impersonation. Your Thai name can be edited later.
        </p>
      </div>

      <form onSubmit={submit} className="flex w-full flex-col items-center gap-6">
        <OtpInput
          value={otp}
          onChange={(v) => {
            setOtp(v);
            if (error) setError(null);
          }}
          autoFocus
          errorMessage={error ?? undefined}
          className="w-full"
        />

        <Button
          type="submit"
          block
          pill
          isDisabled={otp.length < 6}
          isLoading={busy}
        >
          Verify this email
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 text-[0.875rem] text-ink-muted hover:text-ink"
        >
          <RotateCcw aria-hidden className="size-4" />
          Send the code again
        </button>
        <p className="text-[0.75rem] text-ink-muted">
          The code is valid for {OTP_TTL_MINUTES} minutes.
        </p>
        <Link
          href="/login"
          className="text-[0.875rem] text-ink-muted hover:text-ink"
        >
          Start over with a different email
        </Link>
      </div>
    </Surface>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page p-6">
      <Suspense fallback={null}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
