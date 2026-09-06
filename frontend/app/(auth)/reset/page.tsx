import { Suspense } from "react";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/kit/auth/password-forms";
import { Surface } from "@/components/kit/surface";

export const metadata = { title: "Reset password - KU Marketplace" };

/**
 * Lands here from `/forgot` via `?email=...` (see `lib/actions/auth.ts`'s
 * `forgotPassword`). No token in the URL — the real backend resets by email +
 * OTP, the same shape as registration, not a magic link.
 */
export default function ResetPasswordPage() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-page p-6">
      <Surface
        shape="panel"
        elevation="floating"
        className="flex w-full max-w-md flex-col gap-6 p-8"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink">
            Set a new password
          </h1>
          <p className="text-sm text-ink-muted">
            Enter the code we emailed you along with your new password.
          </p>
        </div>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>

        <Link
          href="/forgot"
          className="text-center text-sm text-ink-muted hover:text-ink"
        >
          Request a new code
        </Link>
      </Surface>
    </main>
  );
}
