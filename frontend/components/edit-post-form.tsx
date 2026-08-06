"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POST_MODE_LABELS, type PostMode } from "@/lib/posts";

/**
 * §2.3.2 — managing a live post.
 *
 * A listed item may only have its price and exchange terms changed; the item's
 * own details are locked. The post shape (sell / swap / both) is not editable
 * either — switching between them changes which buttons buyers already saw and
 * which offers are valid, so it is a withdraw-and-repost, not an edit.
 *
 * Withdrawing sends the item back to Unlisted (§2.3.2), which is also the way
 * to unlock its details for editing.
 */
export function EditPostForm({
  itemId,
  itemName,
  mode,
  initialPrice,
  initialWants,
}: {
  itemId: string;
  itemName: string;
  mode: PostMode;
  initialPrice?: number;
  initialWants: string[];
}) {
  const router = useRouter();
  const [price, setPrice] = useState(initialPrice?.toString() ?? "");
  const [wants, setWants] = useState(initialWants);
  const [wantDraft, setWantDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const needsPrice = mode === "buy" || mode === "both";
  const acceptsSwap = mode === "swap" || mode === "both";
  const canSave = !needsPrice || Number(price) > 0;

  function addWant() {
    const value = wantDraft.trim();
    if (value === "" || wants.includes(value)) return;
    setWants((previous) => [...previous, value]);
    setWantDraft("");
  }

  return (
    <Card className="flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">จัดการโพสต์</h1>
        <p className="text-sm text-muted-foreground">
          {itemName} • {POST_MODE_LABELS[mode].th}
        </p>
      </div>

      {/* §2.3.2 — say which half is frozen, so "why can't I fix the photo?"
          has an answer on the screen instead of in a support message. */}
      <div className="flex gap-3 rounded-2xl bg-surface-muted p-4">
        <Lock className="size-5 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          สินค้าที่ประกาศขายแล้วแก้ได้เฉพาะราคาและเงื่อนไขแลกเปลี่ยน
          ข้อมูลตัวสินค้าถูกล็อกไว้ ถ้าต้องการแก้ชื่อ รูป หรือสภาพสินค้า
          ให้ถอนโพสต์ก่อน
        </p>
      </div>

      {needsPrice && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-price" className="text-sm font-semibold">
            ราคา (บาท)
          </Label>
          <Input
            id="edit-price"
            type="number"
            inputMode="numeric"
            min={1}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="h-12 rounded-xl bg-surface-muted"
          />
        </div>
      )}

      {acceptsSwap && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-want" className="text-sm font-semibold">
            อยากแลกกับอะไร
          </Label>
          <div className="flex gap-2">
            <Input
              id="edit-want"
              value={wantDraft}
              onChange={(event) => setWantDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addWant();
                }
              }}
              placeholder="เช่น เครื่องคิดเลข Casio"
              className="h-12 flex-1 rounded-xl bg-surface-muted"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addWant}
              aria-label="เพิ่มรายการที่อยากแลก"
              className="h-12 bg-white"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {wants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {wants.map((want) => (
                <button
                  key={want}
                  type="button"
                  onClick={() =>
                    setWants((previous) => previous.filter((entry) => entry !== want))
                  }
                  className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs text-foreground hover:bg-error-bg hover:text-error"
                >
                  {want}
                  <X className="size-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {saved && (
        <p className="rounded-2xl bg-primary-light/40 px-4 py-3 text-center text-sm text-primary-dark">
          บันทึกเงื่อนไขใหม่แล้ว
        </p>
      )}

      {/* TODO: PATCH the post's price and wants only — the server must reject
          any attempt to touch item fields from here (§2.3.2). */}
      <Button
        disabled={!canSave}
        onClick={() => setSaved(true)}
        className="h-12 w-full bg-primary-dark"
      >
        บันทึกเงื่อนไข
      </Button>

      {withdrawing ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface-muted p-4">
          <p className="text-sm font-semibold text-foreground">ถอนโพสต์นี้?</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            สินค้าจะกลับสู่สถานะ Unlisted และหายจากหน้าตลาด
            ข้อเสนอที่ยังค้างอยู่จะถูกยกเลิกพร้อมแจ้งเตือนผู้ยื่น
            หลังถอนแล้วแก้ไขข้อมูลสินค้าได้ตามปกติ และประกาศใหม่ได้ทุกเมื่อ
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setWithdrawing(false)}
              className="h-12 flex-1 bg-white"
            >
              ย้อนกลับ
            </Button>
            {/* TODO: POST the withdrawal; the server flips the item back to
                unlisted and cancels pending offers (§2.3.2, §3.4). */}
            <Button
              onClick={() => router.push("/inventory")}
              className="h-12 flex-1 bg-error hover:bg-error/90"
            >
              ยืนยันถอนโพสต์
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setWithdrawing(true)}
          className="h-12 w-full bg-white text-sm"
        >
          ถอนโพสต์ (กลับเป็น Unlisted)
        </Button>
      )}

      <Link
        href={`/inventory?item=${itemId}`}
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        กลับไปคลังสินค้า
      </Link>
    </Card>
  );
}
