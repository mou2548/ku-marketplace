"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Download, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function QrWaitingCard({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // The QR encodes an absolute URL so a normal phone camera app can open it —
  // origin is only known in the browser, so this can't be generated on the server.
  useEffect(() => {
    const target = `${window.location.origin}/trade/${tradeId}/success`;
    QRCode.toDataURL(target, {
      width: 820,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1B231E", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [tradeId]);

  return (
    <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-3xl border border-border/30 bg-white p-6 shadow-elevated">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-center text-[32px] leading-10 font-semibold tracking-[-0.32px] text-primary-dark">
          สแกนเพื่อยืนยันการมอบของ
        </h1>
        <p className="max-w-[400px] text-center text-base text-muted-foreground">
          ให้ผู้ขอแลกสแกนคิวอาร์โค้ดนี้ด้วยกล้องมือถือเมื่อมาถึงจุดนัดพบ
          เพื่อจบการแลกเปลี่ยน
        </p>
      </div>

      <div className="relative flex size-[300px] items-center justify-center rounded-3xl border border-border/30 p-6 shadow-card sm:size-[460px]">
        <div className="pointer-events-none absolute inset-px animate-pulse rounded-3xl border-4 border-primary/30" />
        <div className="flex aspect-square w-full max-w-[410px] items-center justify-center rounded-lg bg-white p-2">
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt={`QR code to confirm trade ${tradeId}`}
              width={410}
              height={410}
              unoptimized
              className="size-full"
            />
          ) : (
            <div className="size-full animate-pulse rounded-lg bg-surface-muted" />
          )}
        </div>
      </div>

      <Badge className="h-auto gap-2 bg-surface-muted px-4 py-2 text-sm font-medium tracking-[0.14px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin text-[#7C5800]" />
        รอการสแกน...
      </Badge>

      <div className="flex w-full gap-4 pt-4">
        <Button
          disabled={!qrDataUrl}
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
          ยกเลิก
        </Button>
      </div>

      {/* No backend to notify this screen when the other phone opens the link,
          so a manual demo trigger stands in for the real "scanned" push event. */}
      <button
        type="button"
        onClick={() => router.push(`/trade/${tradeId}/success`)}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        จำลองว่าถูกสแกนแล้ว (demo)
      </button>
    </div>
  );
}
