"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ADMIN_ACTION_LABELS,
  type AdminAction,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

const ACTIONS: AdminAction[] = [
  "dismiss",
  "warn",
  "suspend-temporary",
  "suspend-permanent",
];

/**
 * §7.1 — the admin's decision, at their own discretion, with no fixed
 * thresholds and no scoring from the system.
 *
 * The available actions stop at the account level on purpose (§2.5): there is
 * no refund button and no force-return button, because the platform never held
 * the money or the goods and cannot reverse either.
 */
export function AdminVerdictForm({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [action, setAction] = useState<AdminAction | null>(null);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);

  const canSubmit = action !== null && note.trim().length >= 10;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold">คำตัดสิน</Label>
        <div className="flex flex-col gap-2">
          {ACTIONS.map((option) => {
            const selected = action === option;
            const severe = option === "suspend-permanent";
            return (
              <button
                key={option}
                type="button"
                onClick={() => setAction(option)}
                aria-pressed={selected}
                className={cn(
                  "flex flex-col gap-0.5 rounded-2xl border p-4 text-left transition-colors",
                  selected
                    ? severe
                      ? "border-error bg-error-bg"
                      : "border-primary bg-primary/5"
                    : "border-border/40 bg-white hover:bg-surface-muted"
                )}
              >
                <span className="text-sm font-semibold text-foreground">
                  {ADMIN_ACTION_LABELS[option].th}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ADMIN_ACTION_LABELS[option].detail}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="verdict-note" className="text-sm font-semibold">
          เหตุผลประกอบ (ส่งให้คู่กรณีและใช้เป็นฐานตอนอุทธรณ์)
        </Label>
        <Textarea
          id="verdict-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="สรุปหลักฐานที่ใช้ และเหตุผลที่เลือกบทลงโทษนี้"
          className="min-h-28 rounded-2xl bg-surface-muted"
        />
      </div>

      {/* §7.4 — the punished party may appeal within 7 days, and a different
          admin rules on it. Stating that here keeps the note honest: it will
          be read by someone else. */}
      <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
        ผู้ถูกตัดสินยื่นอุทธรณ์ได้ภายใน 7 วัน
        และแอดมินคนอื่นจะเป็นผู้พิจารณาคำอุทธรณ์นั้น
      </p>

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning-bg p-4">
          <div className="flex items-center gap-2">
            <Gavel className="size-4 shrink-0 text-warning-dark" />
            <span className="text-sm font-semibold text-foreground">
              ยืนยันคำตัดสิน: {action && ADMIN_ACTION_LABELS[action].th}
            </span>
          </div>
          {action === "suspend-permanent" && (
            <p className="text-xs text-muted-foreground">
              การระงับถาวรจะเก็บประวัติบัญชีไว้โดยไม่ลบข้อมูลจริง
              และล็อกอีเมลนั้นไม่ให้สมัครใหม่ได้อีก
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              className="h-12 flex-1 bg-white"
            >
              ย้อนกลับ
            </Button>
            {/* TODO: POST the verdict; the server records it, notifies both
                parties, and opens the §7.4 appeal window. */}
            <Button
              onClick={() => router.push("/admin/reports")}
              className="h-12 flex-1 bg-primary-dark"
            >
              บันทึกคำตัดสิน
            </Button>
          </div>
        </div>
      ) : (
        <Button
          disabled={!canSubmit}
          onClick={() => setConfirming(true)}
          className="h-12 w-full bg-primary-dark"
        >
          ตัดสินรายงาน #{reportId}
        </Button>
      )}
    </div>
  );
}
