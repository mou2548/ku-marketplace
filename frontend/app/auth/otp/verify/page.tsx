"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
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
    <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl bg-white p-10 text-center shadow-md">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold" style={{ color: "#191C1E" }}>
          ยืนยันอีเมลของคุณ
        </h1>
        <p className="text-sm" style={{ color: "#3F4940" }}>
          เราได้ส่งรหัส 6 หลักไปยัง
          <br />
          <span className="font-semibold" style={{ color: "#191C1E" }}>
            {email}
          </span>
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        By continuing, you agree to the{" "}
        <a
          href="#"
          className="underline underline-offset-2"
          style={{ color: "#1D6D41" }}
        >
          KU Marketplace Terms
        </a>
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
                className="size-11 rounded-lg border data-[active=true]:border-[#1D6D41] data-[active=true]:ring-[#1D6D41]/30"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <Button
          type="submit"
          disabled={otp.length < 6}
          className="h-11 w-full rounded-full"
          style={{ backgroundColor: "#1D6D41" }}
        >
          ยืนยันการสมัครสมาชิก (Verify & Complete)
        </Button>
      </form>
    </div>
  );
}

export default function OtpVerifyPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "linear-gradient(0deg, #FAF8FF 0%, #FAF8FF 100%), #FFF" }}
    >
      <Suspense fallback={null}>
        <OtpVerifyForm />
      </Suspense>
    </div>
  );
}
