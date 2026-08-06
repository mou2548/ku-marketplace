"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESET_LINK_TTL_MINUTES, isKuEmail } from "@/lib/auth-rules";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-5 text-center">
        <p className="text-sm font-semibold text-foreground">ส่งลิงก์แล้ว</p>
        {/* Deliberately does not confirm whether the address is registered —
            that would let anyone probe which students have accounts. */}
        <p className="text-xs text-muted-foreground">
          ถ้าอีเมลนี้มีบัญชีอยู่ในระบบ คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่
          ลิงก์มีอายุ {RESET_LINK_TTL_MINUTES} นาที
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-email" className="text-sm font-medium">
          อีเมลมหาวิทยาลัย
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="yourname@ku.th"
            className="h-12 border-none bg-surface-muted pl-11"
          />
        </div>
      </div>

      {/* TODO: POST the request; the server issues the §1.6 reset link. */}
      <Button
        disabled={!isKuEmail(email)}
        onClick={() => setSent(true)}
        className="h-12 w-full bg-primary-dark"
      >
        ส่งลิงก์ตั้งรหัสผ่านใหม่
      </Button>
    </div>
  );
}
