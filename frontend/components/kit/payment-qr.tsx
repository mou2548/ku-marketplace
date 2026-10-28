"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";

import { unwrapAction } from "@/lib/action-result";
import { fetchPaymentQr } from "@/lib/actions/transactions";
import type { PaymentQr as PaymentQrData } from "@/lib/api/transactions";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { QR_COLOR } from "./qr-ticket";
import { formatAmount } from "./slip";
import { Surface } from "./surface";

const SIZE = 224;
const t = getCopy("slip");

/**
 * Where the buyer's money goes. The API builds a PromptPay payload for the
 * seller's number and this deal's amount; until this rendered it, the slip step
 * showed an amount and nowhere to send it.
 *
 * The buyer is usually on the phone that would have to scan it, so the QR can
 * be saved as an image: Thai banking apps read a QR from the photo gallery.
 */
export function PaymentQr({ transactionId, className }: { transactionId: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qr, setQr] = useState<PaymentQrData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    unwrapAction(fetchPaymentQr(transactionId))
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("payQrFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  useEffect(() => {
    if (!qr || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qr.payload, { width: SIZE, margin: 2, color: QR_COLOR }).catch(
      () => setError(t("payQrFailed")),
    );
  }, [qr]);

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !qr) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `promptpay-${transactionId}.png`;
    link.click();
  }

  // The API's refusal (no PromptPay on the seller's side, deal no longer
  // awaiting payment) is the useful thing to show; the slip uploader below
  // still works either way.
  if (error !== null) {
    return (
      <Surface shape="card" elevation="flat" fill="sunken" className={cn("p-4 text-body-sm", className)}>
        {error}
      </Surface>
    );
  }

  return (
    <Surface shape="card" elevation="raised" className={cn("flex flex-col items-center gap-3 p-4 text-center", className)}>
      <h4 className="flex items-center gap-2 text-[1.125rem] leading-[1.4] font-semibold">
        <QrCode aria-hidden className="size-5 text-ink-brand" />
        {qr ? t("payTitle", { amount: formatAmount(qr.amount) }) : t("payLoading")}
      </h4>
      {/* The quiet zone has to stay light in dark mode too. */}
      <div
        className="grid place-items-center rounded-control p-1"
        style={{ width: SIZE + 8, height: SIZE + 8, background: QR_COLOR.light }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={qr ? t("payQrLabel", { amount: formatAmount(qr.amount) }) : t("payLoading")}
          className={cn("rounded-[6px]", !qr && "animate-pulse bg-surface-sunken")}
          width={SIZE}
          height={SIZE}
        />
      </div>
      {qr ? (
        <>
          <p className="text-body-sm font-medium">{t("payTo", { account: qr.promptpay_id })}</p>
          <p className="max-w-sm text-caption leading-[1.6] text-ink-muted">{t("payHow")}</p>
          <Button variant="secondary" onPress={save}>
            <Download aria-hidden className="size-4" />
            {t("paySave")}
          </Button>
          <p className="max-w-sm text-caption leading-[1.6] text-ink-muted">{t("payDirect")}</p>
        </>
      ) : null}
    </Surface>
  );
}
