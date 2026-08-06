"use client";

import { useState } from "react";
import Link from "next/link";
import { PackageCheck, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COURIERS } from "@/lib/couriers";
import { cn } from "@/lib/utils";

/**
 * §4.3.1 — after confirming receipt of the money, the seller records which
 * courier took the parcel and its tracking number. The trade stays in
 * Processing: shipping is not the second confirmation, receipt is (§4.3.4).
 */
export function ShippingForm({ tradeId }: { tradeId: string }) {
  const [courier, setCourier] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = courier !== null && trackingNumber.trim().length >= 6;

  if (submitted) {
    return (
      <Card className="w-full flex-col items-center gap-4 rounded-3xl p-8 text-center shadow-card ring-0">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary-light">
          <PackageCheck className="size-7 text-primary-dark" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">
            บันทึกเลขพัสดุแล้ว
          </h2>
          <p className="text-sm text-muted-foreground">
            ระบบแสดงชื่อบริษัทขนส่งและเลขพัสดุในห้องแชท
            พร้อมลิงก์ให้ผู้ซื้อตรวจสอบสถานะเอง
          </p>
        </div>
        {/* §4.5 — the seller's own protection if the buyer never confirms:
            a nudge at 7 days, the right to report at 14. No auto-complete. */}
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
          ถ้าผู้ซื้อไม่กดยืนยันรับพัสดุภายใน 14 วัน คุณรายงานให้แอดมินตรวจสอบได้
        </p>
        <Link
          href="/chat"
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary-dark text-sm font-medium text-white"
        >
          ไปที่ห้องแชท
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full flex-col gap-5 rounded-3xl p-6 shadow-card ring-0">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Step 3 — แจ้งการจัดส่ง
        </span>
        <h2 className="text-xl font-semibold text-foreground">
          กรอกข้อมูลพัสดุ
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-semibold">บริษัทขนส่ง</Label>
        <div className="grid grid-cols-2 gap-2">
          {COURIERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setCourier(option.name)}
              aria-pressed={courier === option.name}
              className={cn(
                "flex items-center gap-2 rounded-2xl border p-3 text-left text-sm transition-colors",
                courier === option.name
                  ? "border-primary bg-primary/5 font-medium text-primary-dark"
                  : "border-border/40 bg-white text-foreground hover:bg-surface-muted"
              )}
            >
              <Truck className="size-4 shrink-0 text-muted-foreground" />
              {option.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tracking" className="text-sm font-semibold">
          เลขพัสดุ
        </Label>
        <Input
          id="tracking"
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          placeholder="เช่น TH01234567890"
          className="h-12 rounded-xl bg-surface-muted"
        />
        <p className="text-xs text-muted-foreground">
          กรอกให้ตรงกับใบเสร็จของบริษัทขนส่ง
          เลขนี้เป็นหลักฐานหากเกิดข้อพิพาทภายหลัง
        </p>
      </div>

      {/* TODO: POST the shipment; the server stamps shippedAt and starts the
          §4.5 handover clock. */}
      <Button
        disabled={!canSubmit}
        onClick={() => setSubmitted(true)}
        className="h-12 w-full bg-primary-dark"
      >
        แจ้งว่าส่งพัสดุแล้ว
      </Button>

      <Link
        href={`/trade/${tradeId}`}
        className="text-center text-sm text-muted-foreground hover:text-foreground"
      >
        ยกเลิก
      </Link>
    </Card>
  );
}
