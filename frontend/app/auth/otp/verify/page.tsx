"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

function OtpVerifyForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "student.name@ku.th";
  const [otp, setOtp] = useState("");

  return (
    <Card className="w-full max-w-md flex-col items-center gap-6 rounded-3xl p-10 text-center shadow-elevated ring-0">
      <Image
        src="/images/ku-logo.png"
        alt="Kasetsart University"
        width={72}
        height={85}
        priority
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">
          ยืนยันอีเมลของคุณ
        </h1>
        <p className="text-sm text-muted-foreground">
          เราได้ส่งรหัส 6 หลักไปยัง
          <br />
          <span className="font-semibold text-foreground">
            {email}
          </span>
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        By continuing, you agree to the{" "}
        {/* TODO: link to a real terms page once the legal copy exists. */}
        <span className="font-medium text-primary-dark">KU Marketplace Terms</span>
        .
      </p>

      <form
        className="flex w-full flex-col items-center gap-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup className="gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-11 rounded-lg border data-[active=true]:border-primary-dark data-[active=true]:ring-primary-dark/30"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <Button
          type="submit"
          disabled={otp.length < 6}
          className="h-11 w-full rounded-full bg-primary-dark"
        >
          ยืนยันการสมัครสมาชิก (Verify & Complete)
        </Button>
      </form>
    </Card>
  );
}

export default function OtpVerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page-background p-6">
      <Suspense fallback={null}>
        <OtpVerifyForm />
      </Suspense>
    </div>
  );
}
