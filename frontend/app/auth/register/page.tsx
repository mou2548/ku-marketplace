import Image from "next/image";

import { RegisterForm } from "@/components/register-form";

/**
 * §1.1–§1.5 — full registration, split out from the combined login/register
 * card on the landing page, which only ever collected a username and password
 * and could not enforce any of the §1 rules.
 */
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(165deg,#FAFAFA_0%,var(--page-background)_100%)] p-6">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 rounded-3xl bg-white p-8 shadow-elevated sm:p-12">
        <Image
          src="/images/ku-logo.png"
          alt="Kasetsart University"
          width={100}
          height={118}
          priority
        />
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-semibold text-primary-dark">
            สมัครสมาชิก KU Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">
            ระบบปิดสำหรับนิสิตมหาวิทยาลัยเกษตรศาสตร์เท่านั้น
          </p>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}
