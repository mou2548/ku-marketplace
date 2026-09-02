import { Suspense } from "react";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/kit/auth/password-forms";

export const metadata = { title: "Reset password - KU Marketplace" };

/**
 * Lands here from `/forgot` via `?email=...` (see `lib/actions/auth.ts`'s
 * `forgotPassword`). No token in the URL — the real backend resets by email +
 * OTP, the same shape as registration, not a magic link.
 */
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(165deg,#FAFAFA_0%,var(--page-background)_100%)] p-6">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl bg-white p-8 shadow-elevated">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-primary-dark">
            Set a new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the code we emailed you along with your new password.
          </p>
        </div>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>

        <Link
          href="/forgot"
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Request a new code
        </Link>
      </div>
    </div>
  );
}
