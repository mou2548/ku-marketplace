"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { RefreshCw, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QR_TOKEN_TTL_SECONDS } from "@/lib/trades";

function formatCountdown(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * §5.3 + §4.6 — the recipient's personal pickup ticket.
 *
 * Same technical rules as the sale QR (§4.6.1 single-use token, §4.6.6 fifteen
 * minutes on screen), opposite direction: this code lives on the recipient's
 * phone and the giver scans it.
 *
 * §4.6.6 also draws the distinction this screen has to make visible: the
 * countdown is the token's, not the right's. Refreshing mints a new code and
 * the entitlement itself lasts until the giver's pickup deadline.
 */
export function GiveawayTicketCard({
  ticketId,
  giveawayName,
  pickupBy,
  pickupPlace,
}: {
  ticketId: string;
  giveawayName: string;
  pickupBy: string;
  pickupPlace: string;
}) {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_TOKEN_TTL_SECONDS);
  const [tokenNonce, setTokenNonce] = useState(0);
  const [forfeiting, setForfeiting] = useState(false);

  const expired = secondsLeft <= 0;

  const refresh = useCallback(() => {
    setSecondsLeft(QR_TOKEN_TTL_SECONDS);
    setTokenNonce((nonce) => nonce + 1);
  }, []);

  useEffect(() => {
    // TODO: fetch a real single-use token from the API (§4.6.1).
    const token = crypto.randomUUID();
    const target = `${window.location.origin}/giveaway/ticket/${ticketId}/scan?token=${token}`;
    QRCode.toDataURL(target, {
      width: 820,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1B231E", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [ticketId, tokenNonce]);

  useEffect(() => {
    if (expired) return;
    const timer = setInterval(
      () => setSecondsLeft((remaining) => Math.max(0, remaining - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [expired]);

  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-6 rounded-3xl border border-border/30 bg-white p-6 shadow-elevated">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold text-primary-dark">
          ตั๋วรับของ
        </h1>
        <p className="text-base text-muted-foreground">{giveawayName}</p>
        <p className="text-sm text-muted-foreground">
          {pickupPlace} • รับได้ถึง{" "}
          {new Date(pickupBy).toLocaleString("th-TH", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <div className="relative flex size-[280px] items-center justify-center rounded-3xl border border-border/30 p-5 shadow-card sm:size-[360px]">
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-white p-2">
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt={`QR ticket ${ticketId}`}
              width={320}
              height={320}
              unoptimized
              className={expired ? "size-full opacity-20 blur-[2px]" : "size-full"}
            />
          ) : (
            <div className="size-full animate-pulse rounded-lg bg-surface-muted" />
          )}

          {expired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-white/70 p-6 text-center backdrop-blur-[1px]">
              <TimerReset className="size-8 text-warning-dark" />
              <p className="text-sm font-medium text-foreground">
                โค้ดหมดอายุแล้ว
              </p>
              <Button onClick={refresh} className="h-11 gap-2 bg-primary-dark">
                <RefreshCw className="size-4" />
                สร้างโค้ดใหม่
              </Button>
            </div>
          )}
        </div>
      </div>

      <Badge className="h-auto gap-2 bg-surface-muted px-4 py-2 text-sm font-medium text-muted-foreground">
        {expired
          ? "หมดอายุ — กดสร้างใหม่เพื่อให้ผู้แจกสแกน"
          : `โค้ดหมดอายุใน ${formatCountdown(secondsLeft)}`}
      </Badge>

      {/* §4.6.6 — the difference that stops people thinking they lost the item */}
      <p className="rounded-2xl bg-surface-muted px-4 py-3 text-center text-xs text-muted-foreground">
        เวลานี้เป็นอายุของโค้ดบนจอเท่านั้น ไม่ใช่อายุของสิทธิ์
        สิทธิ์ของคุณยังอยู่จนถึงเวลานัดรับ เพียงเปิดหน้านี้ใหม่เพื่อสร้างโค้ดใหม่
      </p>

      {/* §5.4 — giving the slot up is allowed any time before pickup, behind a
          second confirmation so a mis-tap cannot throw the item away. */}
      {forfeiting ? (
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-error/30 bg-error-bg p-4">
          <p className="text-sm font-semibold text-foreground">สละสิทธิ์รับของ?</p>
          <p className="text-xs text-muted-foreground">
            สิทธิ์นี้จะถูกยกเลิกถาวรและกดกลับไม่ได้
            ระบบไม่เลื่อนสิทธิ์ให้ผู้เข้าร่วมลำดับถัดไปโดยอัตโนมัติ
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setForfeiting(false)}
              className="h-12 flex-1 bg-white"
            >
              ย้อนกลับ
            </Button>
            {/* TODO: POST the forfeit; the server sets the ticket to forfeited. */}
            <Button
              onClick={() => router.push("/giveaway/manager")}
              className="h-12 flex-1 bg-error hover:bg-error/90"
            >
              ยืนยันสละสิทธิ์
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setForfeiting(true)}
          className="h-12 w-full bg-white text-sm"
        >
          สละสิทธิ์
        </Button>
      )}
    </div>
  );
}
