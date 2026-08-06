"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * §3.5 — instant buy. The trade is created on the spot without waiting for the
 * seller, so the interesting case is the race: two people press this within
 * moments of each other and the database lock decides. The loser has to be
 * told plainly that the item is gone, not left staring at a spinner.
 */
export function BuyNowActions({
  productId,
  price,
}: {
  productId: string;
  price: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirming" | "lost-race">("idle");

  if (state === "lost-race") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-error-bg p-5 text-center">
        <Ban className="size-7 text-error" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">
            สินค้าถูกซื้อไปแล้ว
          </span>
          <p className="text-xs text-muted-foreground">
            มีผู้ใช้อื่นกดซื้อก่อนคุณเพียงเสี้ยววินาที
            ระบบล็อกธุรกรรมที่ระดับฐานข้อมูลเพื่อไม่ให้สินค้าชิ้นเดียวถูกขายซ้ำ
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/marketplace")}
          className="h-11 w-full bg-white"
        >
          กลับไปหน้าตลาด
        </Button>
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-surface-muted p-4">
        <span className="text-sm font-semibold text-foreground">
          ยืนยันการซื้อ ฿{price.toLocaleString()}?
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          ระบบจะสร้างธุรกรรมทันทีโดยไม่ต้องรอผู้ขายตอบรับ
          สินค้าจะถูกล็อก และเปิดห้องแชทให้อัตโนมัติ
          จากนั้นคุณโอนเงินให้ผู้ขายโดยตรงแล้วอัปโหลดสลิป
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setState("idle")}
            className="h-12 flex-1 bg-white"
          >
            ย้อนกลับ
          </Button>
          {/* TODO: POST the purchase. The server takes the row lock (§3.5) and
              either creates the trade or returns "already sold", which is what
              the lost-race branch above renders. */}
          <Button
            onClick={() => router.push(`/trade/${productId}/payment`)}
            className="h-12 flex-1 bg-primary-dark"
          >
            ยืนยันซื้อ
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setState("lost-race")}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          [เดโม่] จำลองกรณีมีคนกดซื้อตัดหน้า
        </button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setState("confirming")}
      className="h-12 w-full gap-2 text-sm font-medium"
    >
      <ShoppingBag className="size-4" />
      ซื้อทันที
    </Button>
  );
}
