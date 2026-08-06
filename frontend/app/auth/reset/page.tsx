import Link from "next/link";

import { ResetPasswordForm } from "@/components/reset-password-form";
import { RESET_LINK_TTL_MINUTES } from "@/lib/auth-rules";

/**
 * §1.6 — the landing page of the reset link. Without a token there is nothing
 * to reset, so the form is not rendered at all.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(165deg,#FAFAFA_0%,var(--page-background)_100%)] p-6">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl bg-white p-8 shadow-elevated">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-primary-dark">
            ตั้งรหัสผ่านใหม่
          </h1>
          <p className="text-sm text-muted-foreground">
            ลิงก์ตั้งรหัสผ่านมีอายุ {RESET_LINK_TTL_MINUTES} นาทีนับจากเวลาที่ส่ง
          </p>
        </div>

        {token ? (
          <ResetPasswordForm />
        ) : (
          <>
            <p className="rounded-2xl bg-error-bg px-4 py-3 text-sm text-error">
              ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง
            </p>
            <Link
              href="/auth/forgot"
              className="flex h-12 w-full items-center justify-center rounded-full bg-primary-dark text-sm font-medium text-white"
            >
              ขอลิงก์ใหม่
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
