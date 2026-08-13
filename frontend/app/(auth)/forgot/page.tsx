import Link from "next/link";

import { ForgotPasswordForm } from "@/components/kit/auth/password-forms";

/** §1.6 — password reset by emailed link, valid for 30 minutes. */
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(165deg,#FAFAFA_0%,var(--page-background)_100%)] p-6">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl bg-white p-8 shadow-elevated">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-primary-dark">Forgot your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the university email you signed up with and we will send you a reset link.
          </p>
        </div>

        <ForgotPasswordForm />

        <Link
          href="/"
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
