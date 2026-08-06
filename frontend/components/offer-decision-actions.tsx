"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * §3.3 — accepting an offer is not a local yes. It auto-declines every rival
 * offer on the post, pulls the accepted items out of every other offer and
 * open post they were sitting in, and notifies each party affected.
 *
 * The counts come from the server (acceptanceFallout) so the owner sees the
 * blast radius BEFORE committing, not as a surprise afterwards.
 */
export function OfferDecisionActions({
  offerId,
  rivalCount,
  pulledOfferCount,
  pulledPostCount,
}: {
  offerId: string;
  rivalCount: number;
  pulledOfferCount: number;
  pulledPostCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const consequences = [
    rivalCount > 0 && `ข้อเสนออื่นบนโพสต์นี้ ${rivalCount} รายการจะถูกปฏิเสธอัตโนมัติ`,
    pulledOfferCount > 0 &&
      `สินค้าในข้อเสนอนี้จะถูกถอนออกจากข้อเสนออื่นอีก ${pulledOfferCount} รายการ`,
    pulledPostCount > 0 &&
      `โพสต์ของผู้ยื่น ${pulledPostCount} โพสต์ที่ยังเปิดขายอยู่จะถูกถอน`,
  ].filter((line): line is string => typeof line === "string");

  if (confirming) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning-bg p-4 text-left">
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4 shrink-0 text-warning-dark" />
          <span className="text-sm font-semibold text-foreground">
            ตอบรับข้อเสนอนี้?
          </span>
        </div>

        {consequences.length > 0 ? (
          <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            {consequences.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden>•</span>
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            ไม่มีข้อเสนออื่นที่ได้รับผลกระทบ
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          ระบบจะสร้างธุรกรรมใหม่ในสถานะ Pending ล็อกสินค้าทุกชิ้นที่เกี่ยวข้อง
          และเปิดห้องแชทให้อัตโนมัติ
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirming(false)}
            className="h-12 flex-1 bg-white"
          >
            ย้อนกลับ
          </Button>
          {/* TODO: POST the acceptance; the server creates the trade, locks the
              items, auto-declines the rivals, and fires the §3.3 notifications. */}
          <Button
            onClick={() => router.push("/history")}
            className="h-12 flex-1 bg-primary-dark"
          >
            ยืนยันตอบรับ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* TODO: POST the rejection and notify the sender. */}
      <Button
        variant="outline"
        onClick={() => router.push(`/offers?declined=${offerId}`)}
        className="h-12 flex-1 gap-2 border-error text-error hover:bg-error/5"
      >
        <X className="size-4" />
        ปฏิเสธ
      </Button>
      <Button
        onClick={() => setConfirming(true)}
        className="h-12 flex-1 gap-2 bg-primary-dark"
      >
        <Check className="size-4" />
        ตอบรับ
      </Button>
    </div>
  );
}
