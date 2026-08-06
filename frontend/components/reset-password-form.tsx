"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Lock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_RULES, checkPassword, isPasswordValid } from "@/lib/auth-rules";
import { cn } from "@/lib/utils";

/** §1.4 — the same password rules apply on reset as on registration. */
export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const rules = checkPassword(password);
  const matches = password !== "" && password === confirm;

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-2xl bg-primary-light/40 px-4 py-3 text-center text-sm text-primary-dark">
          ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว
        </p>
        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary-dark text-sm font-medium text-white"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password" className="text-sm font-medium">
          รหัสผ่านใหม่
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 border-none bg-surface-muted pl-11"
          />
        </div>
        <ul className="flex flex-col gap-1">
          {[
            {
              ok: rules.longEnough && rules.shortEnough,
              label: `ความยาว ${PASSWORD_RULES.minLength}–${PASSWORD_RULES.maxLength} ตัวอักษร`,
            },
            { ok: rules.hasLetter, label: "มีตัวอักษรอย่างน้อย 1 ตัว" },
            { ok: rules.hasDigit, label: "มีตัวเลขอย่างน้อย 1 ตัว" },
          ].map((rule) => (
            <li
              key={rule.label}
              className={cn(
                "flex items-center gap-2 text-xs",
                rule.ok ? "text-primary-dark" : "text-muted-foreground"
              )}
            >
              {rule.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              {rule.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-new" className="text-sm font-medium">
          ยืนยันรหัสผ่านใหม่
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirm-new"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-12 border-none bg-surface-muted pl-11"
          />
        </div>
      </div>

      {/* TODO: POST the new password with the token from the URL. */}
      <Button
        disabled={!isPasswordValid(password) || !matches}
        onClick={() => setDone(true)}
        className="h-12 w-full bg-primary-dark"
      >
        บันทึกรหัสผ่านใหม่
      </Button>
    </div>
  );
}
