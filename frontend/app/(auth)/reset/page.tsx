import { Suspense } from "react";
import Link from "next/link";

import { LinkButton } from "@/components/kit/button";
import { ResetPasswordForm } from "@/components/kit/auth/password-forms";
import { Surface } from "@/components/kit/surface";

export const metadata = { title: "Reset password - KU Marketplace" };

/**
 * Lands here from `/forgot` via `?email=...` (see `lib/actions/auth.ts`'s
 * `forgotPassword`). No token in the URL — the real backend resets by email +
 * OTP, the same shape as registration, not a magic link.
 *
 * Without an email there is no account to reset, so the form is not shown at
 * all; the page points back to `/forgot` instead (audit F07).
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const { email } = await searchParams;
  const hasEmail = typeof email === "string" && email.trim() !== "";

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-page p-6">
      <Surface
        shape="panel"
        elevation="floating"
        className="flex w-full max-w-md flex-col gap-6 p-8"
      >
        {hasEmail ? (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold text-ink">
                Set a new password
              </h1>
              <p className="text-sm text-ink-muted">
                Enter the code we emailed you along with your new password.
              </p>
            </div>

            {/* Email goes through Resend's test sender until a domain is
                verified, and that sender only reaches the Resend account owner.
                In development the API logs every code instead. */}
            {process.env.NODE_ENV !== "production" ? (
              <p className="rounded-control border border-tone-warning-border bg-tone-warning-bg px-3 py-2 text-caption text-tone-warning-fg">
                Development: the email may not arrive. The code is printed in the
                API log as &quot;[DEV] Password reset OTP for ...&quot;.
              </p>
            ) : null}

            <Suspense fallback={null}>
              <ResetPasswordForm />
            </Suspense>

            <Link
              href="/forgot"
              className="text-center text-sm text-ink-muted hover:text-ink"
            >
              Request a new code
            </Link>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold text-ink">
                Start again to reset your password
              </h1>
              <p className="text-sm text-ink-muted">
                This page does not know which account to reset. Enter your
                university email and we will send you a new reset code.
              </p>
            </div>

            <LinkButton href="/forgot" block>
              Request a reset code
            </LinkButton>

            <Link
              href="/login"
              className="flex min-h-11 items-center justify-center text-sm text-ink-muted hover:text-ink"
            >
              Back to sign in
            </Link>
          </>
        )}
      </Surface>
    </main>
  );
}
