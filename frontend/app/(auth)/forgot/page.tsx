import Link from "next/link";

import { ForgotPasswordForm } from "@/components/kit/auth/password-forms";
import { Surface } from "@/components/kit/surface";
import { OTP_TTL_MINUTES } from "@/lib/auth-rules";

/**
 * `POST /auth/password/forgot` — email + a 6-digit code, same shape as
 * registration. Not a magic link: the real backend has no token concept for
 * password reset (see `docs/design/api-gaps.md`).
 */
export const metadata = { title: "Forgot password - KU Marketplace" };

export default function ForgotPasswordPage() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-page p-6">
      <Surface
        shape="panel"
        elevation="floating"
        className="flex w-full max-w-md flex-col gap-6 p-8"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink">Forgot your password</h1>
          <p className="text-sm text-ink-muted">
            Enter the university email you signed up with and we will email you
            a {OTP_TTL_MINUTES}-minute reset code.
          </p>
        </div>

        <ForgotPasswordForm />

        <Link
          href="/login"
          className="text-center text-sm text-ink-muted hover:text-ink"
        >
          Back to sign in
        </Link>
      </Surface>
    </main>
  );
}
