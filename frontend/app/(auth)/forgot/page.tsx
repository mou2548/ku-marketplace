import Link from "next/link";

import { ForgotPasswordForm } from "@/components/kit/auth/password-forms";
import { OTP_TTL_MINUTES } from "@/lib/auth-rules";

/**
 * `POST /auth/password/forgot` — email + a 6-digit code, same shape as
 * registration. Not a magic link: the real backend has no token concept for
 * password reset (see `docs/design/api-gaps.md`).
 */
export const metadata = { title: "Forgot password - KU Marketplace" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(165deg,#FAFAFA_0%,var(--page-background)_100%)] p-6">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl bg-white p-8 shadow-elevated">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-primary-dark">Forgot your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the university email you signed up with and we will email you
            a {OTP_TTL_MINUTES}-minute reset code.
          </p>
        </div>

        <ForgotPasswordForm />

        <Link
          href="/login"
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
