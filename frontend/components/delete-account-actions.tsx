"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRM_WORD = "ลบบัญชี";

/** §1.7 — deletion, gated behind typing the phrase so it cannot be mis-tapped. */
export function DeleteAccountActions() {
  const router = useRouter();
  const [typed, setTyped] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-delete" className="text-sm font-semibold">
          พิมพ์ &ldquo;{CONFIRM_WORD}&rdquo; เพื่อยืนยัน
        </Label>
        <Input
          id="confirm-delete"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={CONFIRM_WORD}
          className="h-12 rounded-xl bg-surface-muted"
        />
      </div>

      {/* TODO: DELETE the account; the server re-checks for live trades before
          doing anything, since this page's check is only as fresh as the load. */}
      <Button
        disabled={typed.trim() !== CONFIRM_WORD}
        onClick={() => router.push("/")}
        className="h-12 w-full bg-error hover:bg-error/90"
      >
        ลบบัญชีถาวร
      </Button>
    </div>
  );
}
