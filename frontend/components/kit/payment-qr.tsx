"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";

import { unwrapAction } from "@/lib/action-result";
import { fetchPaymentQr, fetchRefundQr } from "@/lib/actions/transactions";
import type { PaymentQr as PaymentQrData } from "@/lib/api/transactions";
import { getCopy } from "@/lib/copy";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { QR_COLOR } from "./qr-ticket";
import { Surface } from "./surface";

const SIZE = 224;
const t = getCopy("slip");

/** Which way the money goes; the copy keys differ, the QR does not. */
const KINDS = {
  payment: {
    fetch: fetchPaymentQr,
    title: "payTitle",
    to: "payTo",
    direct: "payDirect",
    loading: "payLoading",
    failed: "payQrFailed",
    file: "promptpay",
  },
  refund: {
    fetch: fetchRefundQr,
    title: "refundQrTitle",
    to: "refundQrTo",
    direct: "refundQrDirect",
    loading: "refundQrLoading",
    failed: "refundQrFailed",
    file: "promptpay-refund",
  },
} as const;

/**
 * Where the buyer's money goes. The API builds a PromptPay payload for the
 * seller's number and this deal's amount; until this rendered it, the slip step
 * showed an amount and nowhere to send it.
 *
 * The buyer is usually on the phone that would have to scan it, so the QR can
 * be saved as an image: Thai banking apps read a QR from the photo gallery.
 *
 * `kind="refund"` is the same QR the other way round: the buyer's number, for
 * the seller to send a cancelled deal's money back.
 */
export function PaymentQr({
  transactionId,
  kind = "payment",
  className,
}: {
  transactionId: number;
  kind?: keyof typeof KINDS;
  className?: string;
}) {
  const k = KINDS[kind];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qr, setQr] = useState<PaymentQrData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    unwrapAction(k.fetch(transactionId))
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t(k.failed));
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId, k]);

  useEffect(() => {
    if (!qr || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qr.payload, { width: SIZE, margin: 2, color: QR_COLOR }).catch(
      () => setError(t(k.failed)),
    );
  }, [qr, k]);

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !qr) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${k.file}-${transactionId}.png`;
    link.click();
  }

  // The API's refusal (no PromptPay on the payee's side, deal no longer
  // awaiting the money) is the useful thing to show; the slip uploader below
  // is still there either way.
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
        {qr ? t(k.title, { amount: formatPrice(qr.amount) }) : t(k.loading)}
      </h4>
      {/* The quiet zone has to stay light in dark mode too. */}
      <div
        className="grid place-items-center rounded-control p-1"
        style={{ width: SIZE + 8, height: SIZE + 8, background: QR_COLOR.light }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={qr ? t("payQrLabel", { amount: formatPrice(qr.amount) }) : t(k.loading)}
          className={cn("rounded-[6px]", !qr && "animate-pulse bg-surface-sunken")}
          width={SIZE}
          height={SIZE}
        />
      </div>
      {qr ? (
        <>
          <p className="text-body-sm font-medium">{t(k.to, { account: qr.promptpay_id })}</p>
          <p className="max-w-sm text-caption leading-[1.6] text-ink-muted">{t("payHow")}</p>
          <Button variant="secondary" onPress={save}>
            <Download aria-hidden className="size-4" />
            {t("paySave")}
          </Button>
          <p className="max-w-sm text-caption leading-[1.6] text-ink-muted">{t(k.direct)}</p>
        </>
      ) : null}
    </Surface>
  );
}
