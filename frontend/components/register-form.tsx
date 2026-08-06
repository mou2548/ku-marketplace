"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Lock, Mail, Phone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ALLOWED_EMAIL_DOMAINS,
  OTP_TTL_MINUTES,
  PASSWORD_RULES,
  checkPassword,
  derivedFirstName,
  isKuEmail,
  isPasswordValid,
} from "@/lib/auth-rules";
import { cn } from "@/lib/utils";

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 text-xs",
        ok ? "text-primary-dark" : "text-muted-foreground"
      )}
    >
      {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      {label}
    </li>
  );
}

/**
 * §1.1–§1.5 — registration.
 *
 * The email domain check is the gate the whole platform's trust rests on
 * (§1.1), so it is enforced before anything else can be submitted. The English
 * first name is derived and shown read-only here so the §1.3 lock is visible
 * at the moment the account is created, not discovered later in settings.
 */
export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");

  const emailOk = isKuEmail(email);
  const rules = checkPassword(password);
  const passwordsMatch = password !== "" && password === confirm;
  const canSubmit = emailOk && isPasswordValid(password) && passwordsMatch;

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-base">
          อีเมลมหาวิทยาลัย
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={`yourname@${ALLOWED_EMAIL_DOMAINS[0]}`}
            className="h-14 border-none bg-surface-muted pl-11 text-base"
          />
        </div>
        <p className={cn("text-xs", email !== "" && !emailOk ? "text-error" : "text-muted-foreground")}>
          {/* §1.1 — one email, one account, and only these two domains. */}
          รับเฉพาะ @{ALLOWED_EMAIL_DOMAINS.join(" และ @")} เท่านั้น • 1 อีเมลต่อ 1 บัญชี
        </p>
      </div>

      {/* §1.3 — derived, stored once, and not editable by the user. */}
      {emailOk && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-surface-muted p-4">
          <span className="text-xs font-semibold text-foreground">
            ชื่อจริงภาษาอังกฤษ (ล็อกอัตโนมัติ)
          </span>
          <span className="text-lg font-semibold text-primary-dark">
            {derivedFirstName(email)}
          </span>
          <p className="text-xs text-muted-foreground">
            ระบบดึงจากหน้าอีเมลสถาบันและล็อกไว้แก้ไขไม่ได้
            เพราะใช้เป็นหลักยึดป้องกันการปลอมตัว
            ส่วนนามสกุลและชื่อภาษาไทยแก้ไขได้เองภายหลัง
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-base">
          รหัสผ่าน
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="········"
            className="h-14 border-none bg-surface-muted pl-11 text-base"
          />
        </div>
        <ul className="flex flex-col gap-1">
          <Rule
            ok={rules.longEnough && rules.shortEnough}
            label={`ความยาว ${PASSWORD_RULES.minLength}–${PASSWORD_RULES.maxLength} ตัวอักษร`}
          />
          <Rule ok={rules.hasLetter} label="มีตัวอักษรอย่างน้อย 1 ตัว" />
          <Rule ok={rules.hasDigit} label="มีตัวเลขอย่างน้อย 1 ตัว" />
        </ul>
        {/* §1.4 — no symbol or uppercase requirement, on purpose. */}
        <p className="text-xs text-muted-foreground">
          ไม่บังคับอักขระพิเศษหรือตัวพิมพ์ใหญ่
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm" className="text-base">
          ยืนยันรหัสผ่าน
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="········"
            className="h-14 border-none bg-surface-muted pl-11 text-base"
          />
        </div>
        {confirm !== "" && !passwordsMatch && (
          <p className="text-xs text-error">รหัสผ่านไม่ตรงกัน</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone" className="text-base">
          เบอร์โทรศัพท์ (ไม่บังคับ)
        </Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="08X-XXX-XXXX"
            className="h-14 border-none bg-surface-muted pl-11 text-base"
          />
        </div>
        {/* §1.5 — no OTP on this field; the SMS cost isn't worth the benefit. */}
        <p className="text-xs text-muted-foreground">
          ใช้เป็นช่องทางติดต่อสำรองเท่านั้น ไม่มีการยืนยันด้วย SMS
        </p>
      </div>

      {/* TODO: POST the registration; the server sends the §1.2 OTP. */}
      <Button
        disabled={!canSubmit}
        onClick={() => router.push("/auth/otp/verify")}
        className="h-14 w-full rounded-full bg-primary-dark text-lg"
      >
        สมัครสมาชิก
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ระบบจะส่งรหัสยืนยัน 6 หลักไปยังอีเมลของคุณ มีอายุ {OTP_TTL_MINUTES} นาที
      </p>

      <Link
        href="/"
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
      </Link>
    </div>
  );
}
