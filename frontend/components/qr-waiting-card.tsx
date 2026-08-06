"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Download, Loader2, RefreshCw, TimerReset } from "lucide-react";

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

export function QrWaitingCard({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // §4.6.6 — the countdown belongs to the token on screen right now, not to the
  // right itself. Refreshing mints a new token; the trade is unaffected.
  const [secondsLeft, setSecondsLeft] = useState(QR_TOKEN_TTL_SECONDS);
  const [tokenNonce, setTokenNonce] = useState(0);

  const expired = secondsLeft <= 0;

  const refresh = useCallback(() => {
    setSecondsLeft(QR_TOKEN_TTL_SECONDS);
    setTokenNonce((nonce) => nonce + 1);
  }, []);

  // The QR encodes an absolute URL so a normal phone camera app can open it
  // (§4.6.3) — origin is only known in the browser, so this can't be generated
  // on the server. §4.6.1: it carries the trade id and a single-use token, and
  // no personal data.
  useEffect(() => {
    // TODO: request a real single-use token from the API instead of minting a
    // random one here — this one proves nothing on its own.
    const token = crypto.randomUUID();
    const target = `${window.location.origin}/trade/${tradeId}/scan?token=${token}`;
    QRCode.toDataURL(target, {
      width: 820,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1B231E", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [tradeId, tokenNonce]);

  useEffect(() => {
    if (expired) return;
    const timer = setInterval(
      () => setSecondsLeft((remaining) => Math.max(0, remaining - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [expired]);

  return (
    <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-3xl border border-border/30 bg-white p-6 shadow-elevated">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-center text-[32px] leading-10 font-semibold tracking-[-0.32px] text-primary-dark">
          สแกนเพื่อยืนยันการมอบของ
        </h1>
        <p className="max-w-[400px] text-center text-base text-muted-foreground">
          ให้ผู้ซื้อสแกนคิวอาร์โค้ดนี้ด้วยกล้องมือถือเมื่อมาถึงจุดนัดพบ
          เพื่อยืนยันว่าได้รับสินค้าแล้ว
        </p>
      </div>

      <div className="relative flex size-[300px] items-center justify-center rounded-3xl border border-border/30 p-6 shadow-card sm:size-[460px]">
        {!expired && (
          <div className="pointer-events-none absolute inset-px animate-pulse rounded-3xl border-4 border-primary/30" />
        )}
        <div className="flex aspect-square w-full max-w-[410px] items-center justify-center rounded-lg bg-white p-2">
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt={`QR code to confirm trade ${tradeId}`}
              width={410}
              height={410}
              unoptimized
              className={expired ? "size-full opacity-20 blur-[2px]" : "size-full"}
            />
          ) : (
            <div className="size-full animate-pulse rounded-lg bg-surface-muted" />
          )}

          {/* Expiry hides the code rather than just labelling it — a stale QR
              that still reads is exactly what §4.6.6 is trying to prevent. */}
          {expired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-white/70 p-6 text-center backdrop-blur-[1px]">
              <TimerReset className="size-8 text-warning-dark" />
              <p className="text-sm font-medium text-foreground">
                QR Code หมดอายุแล้ว
              </p>
              <Button onClick={refresh} className="h-11 gap-2 bg-primary-dark">
                <RefreshCw className="size-4" />
                สร้าง QR ใหม่
              </Button>
            </div>
          )}
        </div>
      </div>

      <Badge className="h-auto gap-2 bg-surface-muted px-4 py-2 text-sm font-medium tracking-[0.14px] text-muted-foreground">
        {expired ? (
          <>
            <TimerReset className="size-3.5 text-warning-dark" />
            หมดอายุ — กดสร้างใหม่เพื่อสแกน
          </>
        ) : (
          <>
            <Loader2 className="size-3.5 animate-spin text-warning-dark" />
            รอการสแกน... หมดอายุใน {formatCountdown(secondsLeft)}
          </>
        )}
      </Badge>

      <div className="flex w-full gap-4 pt-4">
        <Button
          disabled={!qrDataUrl || expired}
          onClick={() => {
            if (!qrDataUrl) return;
            const link = document.createElement("a");
            link.href = qrDataUrl;
            link.download = `ku-marketplace-trade-${tradeId}.png`;
            link.click();
          }}
          className="h-12 flex-1 gap-2 text-sm font-medium tracking-[0.14px]"
        >
          <Download className="size-4" />
          บันทึกรูปภาพ
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/chat")}
          className="h-12 flex-1 bg-white text-sm font-medium tracking-[0.14px]"
        >
          กลับไปห้องแชท
        </Button>
      </div>

      {/* No backend to notify this screen when the other phone opens the link,
          so a manual demo trigger stands in for the real "scanned" push event.
          It routes through the scan page, not straight to success — the §4.6.4
          identity check and §4.6.5 second confirm must not be skippable. */}
      <button
        type="button"
        onClick={() => router.push(`/trade/${tradeId}/scan?token=demo`)}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        จำลองการสแกนจากมือถือผู้ซื้อ (demo)
      </button>
    </div>
  );
}
