"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * §1.3 — which parts of a name may change, and which may not.
 *
 * The English first name comes from the institutional address and is locked
 * for the life of the account. Everything else is the user's own to edit. The
 * lock is shown as a disabled field with the reason next to it, rather than
 * hidden, so the rule is legible instead of feeling like a bug.
 */
export function ProfileEditForm({
  lockedFirstName,
  initial,
}: {
  lockedFirstName: string;
  initial: { lastNameEn: string; firstNameTh: string; lastNameTh: string; phone: string };
}) {
  const [lastNameEn, setLastNameEn] = useState(initial.lastNameEn);
  const [firstNameTh, setFirstNameTh] = useState(initial.firstNameTh);
  const [lastNameTh, setLastNameTh] = useState(initial.lastNameTh);
  const [phone, setPhone] = useState(initial.phone);
  const [saved, setSaved] = useState(false);

  return (
    <Card className="flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
      <div className="flex flex-col gap-2">
        <Label htmlFor="first-en" className="flex items-center gap-2 text-sm font-semibold">
          <Lock className="size-3.5 text-muted-foreground" />
          ชื่อจริงภาษาอังกฤษ
        </Label>
        <Input
          id="first-en"
          value={lockedFirstName}
          disabled
          className="h-12 rounded-xl bg-surface-muted text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          ดึงจากอีเมลสถาบันและล็อกไว้ถาวร
          เป็นข้อมูลที่ตรวจสอบย้อนกลับได้จึงแก้ไขเองไม่ได้
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="last-en" className="text-sm font-semibold">
          นามสกุลภาษาอังกฤษ
        </Label>
        <Input
          id="last-en"
          value={lastNameEn}
          onChange={(event) => setLastNameEn(event.target.value)}
          className="h-12 rounded-xl bg-surface-muted"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="first-th" className="text-sm font-semibold">
            ชื่อภาษาไทย
          </Label>
          <Input
            id="first-th"
            value={firstNameTh}
            onChange={(event) => setFirstNameTh(event.target.value)}
            className="h-12 rounded-xl bg-surface-muted"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="last-th" className="text-sm font-semibold">
            นามสกุลภาษาไทย
          </Label>
          <Input
            id="last-th"
            value={lastNameTh}
            onChange={(event) => setLastNameTh(event.target.value)}
            className="h-12 rounded-xl bg-surface-muted"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-phone" className="text-sm font-semibold">
          เบอร์โทรศัพท์ (ไม่บังคับ)
        </Label>
        <Input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="08X-XXX-XXXX"
          className="h-12 rounded-xl bg-surface-muted"
        />
      </div>

      {saved && (
        <p className="rounded-2xl bg-primary-light/40 px-4 py-3 text-sm text-primary-dark">
          บันทึกข้อมูลแล้ว
        </p>
      )}

      {/* TODO: PATCH the profile; the server rejects any attempt to change the
          locked English first name (§1.3). */}
      <Button onClick={() => setSaved(true)} className="h-12 w-full bg-primary-dark">
        บันทึก
      </Button>

      <Link
        href="/account"
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        กลับไปหน้าบัญชี
      </Link>
    </Card>
  );
}
