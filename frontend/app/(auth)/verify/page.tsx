"use client";

import { Suspense, useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, MailQuestionMark, RotateCcw } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { OtpInput } from "@/components/kit/otp-input";
import { Surface } from "@/components/kit/surface";
import { resendOtp, verifyRegisterOtp } from "@/lib/actions/auth";
import { OTP_TTL_MINUTES, derivedFirstName } from "@/lib/auth-rules";

/**
 * The one-time code step.
 *
 * Verifying opens the account in the same call (`POST /auth/otp/verify`) —
 * there is no later step, so success here goes straight to `/` rather than a
 * profile page that has nowhere to send its fields (see
 * `docs/design/api-gaps.md`).
 *
 * The locked English name moved here from the registration form. It is derived
 * from the institutional email, so showing it before the email is verified was
 * asserting an identity nobody had proved yet. Here it reads as what it is:
 * this is who the university says you are, confirm and continue.
 */
function VerifyForm({ email }: { email: string }) {
  const [otp, setOtp] = useState("");
  const [state, formAction, isPending] = useActionState(
    verifyRegisterOtp,
    undefined,
  );
  const [resendState, resendAction, isResending] = useActionState(
    resendOtp,
    undefined,
  );

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
        <p className="text-body-sm text-ink-muted">
          We sent a 6-digit code to
          <br />
          <span className="font-semibold text-ink">{email}</span>
        </p>
      </div>

      {/* Identity, confirmed at the moment it is proved rather than claimed. */}
      <div className="flex w-full flex-col gap-1.5 rounded-card bg-surface-sunken p-4 text-left shadow-sunken">
        <span className="flex items-center gap-1.5 text-meta font-semibold text-ink-secondary">
          <Lock aria-hidden className="size-3.5" />
          Your name on KU Marketplace
        </span>
        <span className="text-[1.125rem] font-semibold text-ink-brand">
          {derivedFirstName(email)}
        </span>
        <p className="text-meta leading-[1.6] text-ink-muted">
          Taken from your institutional email and locked, because it is the
          anchor that stops impersonation. Your Thai name can be edited later.
        </p>
      </div>

      <form action={formAction} className="flex w-full flex-col items-center gap-6">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="otp" value={otp} />

        <OtpInput
          value={otp}
          onChange={setOtp}
          autoFocus
          errorMessage={state?.error ?? undefined}
          className="w-full"
        />

        <Button
          type="submit"
          block
          pill
          isDisabled={otp.length < 6}
          isLoading={isPending}
        >
          Verify this email
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2">
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={isResending}
            className="flex items-center gap-1.5 text-body-sm text-ink-muted hover:text-ink disabled:opacity-50"
          >
            <RotateCcw aria-hidden className="size-4" />
            {isResending ? "Sending..." : "Send the code again"}
          </button>
        </form>
        {resendState?.resent ? (
          <p className="text-meta font-medium text-ink-brand">
            A new code is on its way.
          </p>
        ) : resendState?.error ? (
          <p role="alert" className="text-meta font-medium text-tone-danger-fg">
            {resendState.error}
          </p>
        ) : null}
        <p className="text-meta text-ink-muted">
          The code is valid for {OTP_TTL_MINUTES} minutes.
        </p>
        <Link
          href="/login"
          className="text-body-sm text-ink-muted hover:text-ink"
        >
          Start over with a different email
        </Link>
      </div>
    </Surface>
  );
}

/**
 * Reached without an email (a bookmark, a shared link, a reload after the
 * query was lost): there is no code to check and no name to derive, so this
 * says so and points back to the start instead of inventing an address
 * (audit F06).
 */
function MissingEmail() {
  return (
    <Surface
      shape="panel"
      elevation="floating"
      className="flex w-full max-w-md flex-col items-center gap-6 p-10 text-center"
    >
      <span className="grid size-14 place-items-center rounded-pill bg-surface-sunken text-ink-secondary shadow-sunken">
        <MailQuestionMark aria-hidden className="size-6" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="text-[1.25rem] leading-[1.3] font-bold">
          Start again to get a code
        </h1>
        <p className="text-body-sm text-ink-muted">
          This page does not know which email to verify. Register from the
          sign-in page and we will email you a new 6-digit code.
        </p>
      </div>

      <LinkButton href="/login" block pill>
        Back to sign in
      </LinkButton>
    </Surface>
  );
}

function VerifyStep() {
  const email = useSearchParams().get("email")?.trim() ?? "";
  return email ? <VerifyForm email={email} /> : <MissingEmail />;
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page p-6">
      <Suspense fallback={null}>
        <VerifyStep />
      </Suspense>
    </div>
  );
}
