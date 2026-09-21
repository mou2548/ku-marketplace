"use client";

import { formatDateTime } from "@/lib/date-format";


import { getCopy } from "@/lib/copy";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button as AriaButton } from "react-aria-components";
import { Check, ImagePlus, RotateCcw, Send, X, ZoomIn } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { PhotoViewer, PhotoViewerTrigger } from "./photo-viewer";
import { Surface } from "./surface";
import { TrustBadge } from "./trust-badge";

/**
 * Research trust gap T2: there is no escrow. Money moves by bank transfer,
 * outside the platform. The slip IS the receipt, and the only thing that makes
 * a transfer feel safe is seeing the three beats happen in order:
 *
 *   buyer uploads  ->  seller inspects  ->  seller confirms
 *
 * The old UI flipped a boolean silently. Both timestamps exist in the schema
 * (`payment_confirmed_by_buyer_at`, `payment_confirmed_by_seller_at`) and both
 * are rendered here.
 *
 * Three components share one image frame:
 *
 *   SlipUploader  the sender, before and after the upload
 *   SlipReviewer  the receiver's decision, while it is their turn
 *   SlipViewer    read-only, for either party, for the life of the deal
 *
 * The last one exists because the first two are gated on whose turn it is. Once
 * the seller confirms, neither of them renders, and the receipt for a transfer
 * that happened off-platform used to disappear from the only screen that ever
 * showed it.
 */

const MAX_BYTES = 5 * 1024 * 1024;

function formatAmount(amount: number) {
  return `฿${amount.toLocaleString("en-GB")}`;
}

/**
 * `next/image` refuses any src that is neither a rooted path nor an http(s)
 * URL, and its optimizer has to fetch the bytes server-side to resize them. A
 * `blob:` object URL fails both counts: it is not a parseable remote URL, and
 * it only exists inside the tab that created it. So the local preview — the
 * whole point of looking at a slip before sending it — renders as a plain
 * <img>, and only persisted slips go through next/image.
 */
function SlipImage({ src, alt }: { src: string; alt: string }) {
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 size-full object-contain"
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 640px) 32rem, 100vw"
      className="object-contain"
    />
  );
}

/**
 * The slip at card size, with the full-screen viewer behind a tap.
 *
 * It used to open a new tab. On a phone that leaves the app: the conversation,
 * the scroll position and the deal all go away to show one image, and coming
 * back is a browser gesture rather than a close button. `PhotoViewer` keeps the
 * reader inside the room and gives them pinch, double-tap and swipe-to-close
 * instead.
 */
function SlipFrame({
  src,
  alt,
  title,
  caption,
  size = "card",
  className,
}: {
  src: string;
  alt: string;
  /** Viewer heading — says which slip this is (payment, refund, membership). */
  title: string;
  caption?: string;
  size?: "card" | "tall";
  className?: string;
}) {
  const t = getCopy();
  return (
    <PhotoViewerTrigger>
      <AriaButton
        aria-label={t("slip.viewFullscreen")}
        className={cn(
          "relative block w-full overflow-hidden rounded-control bg-surface-sunken shadow-sunken",
          size === "tall" ? "h-[min(28rem,50dvh)]" : "h-[min(16rem,35dvh)]",
          className,
        )}
      >
        <SlipImage src={src} alt={alt} />
        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-pill bg-surface-inverse/80 px-2 py-1.5 text-meta font-medium text-white">
          <ZoomIn aria-hidden className="size-3.5" />
          {t("slip.viewFull")}
        </span>
      </AriaButton>

      <PhotoViewer src={src} alt={alt} title={title} caption={caption} />
    </PhotoViewerTrigger>
  );
}

function UploadedAt({
  at,
  labelKey,
}: {
  at: string;
  labelKey: "slip.uploadedAt" | "slip.uploadedByBuyerAt";
}) {
  const t = getCopy();
  return (
    <p className="mt-3 text-caption leading-[1.5] text-ink-muted">
      {t(labelKey)}{" "}
      <time dateTime={at}>
        {formatDateTime(new Date(at))}
      </time>
    </p>
  );
}

export interface SlipViewerProps {
  slipUrl: string;
  /** Rendered beside the heading when the amount is known. */
  amount?: number;
  uploadedAt?: string | null;
  /** Defaults to "Transfer slip"; refund and membership slips pass their own. */
  title?: string;
  /** Removes the card shell when the viewer is already inside one. */
  embedded?: boolean;
  className?: string;
}

/**
 * Read-only, no decision attached. Rendered for both parties regardless of
 * status or turn, which is what keeps the receipt reachable after the deal is
 * Completed, Cancelled, or sitting under an admin review.
 */
export function SlipViewer({
  slipUrl,
  amount,
  uploadedAt,
  title,
  embedded = false,
  className,
}: SlipViewerProps) {
  const t = getCopy();
  const heading = title ?? t("slip.transferSlip");

  return (
    <Surface
      shape="card"
      elevation={embedded ? "none" : "raised"}
      fill={embedded ? "none" : "surface"}
      className={cn(embedded ? "p-0" : "p-4", className)}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-body font-semibold">{heading}</h4>
        {amount !== undefined ? (
          <span data-numeric className="shrink-0 whitespace-nowrap text-body-lg font-semibold">
            {formatAmount(amount)}
          </span>
        ) : null}
      </header>

      <SlipFrame
        src={slipUrl}
        alt={heading}
        title={heading}
        caption={amount !== undefined ? formatAmount(amount) : undefined}
      />

      {uploadedAt ? <UploadedAt at={uploadedAt} labelKey="slip.uploadedAt" /> : null}
    </Surface>
  );
}

export interface SlipUploaderProps {
  amount: number;
  onUpload: (file: File) => Promise<void>;
  isUploaded?: boolean;
  uploadedAt?: string | null;
  /**
   * The persisted slip, once the backend has one. The local preview is a blob
   * URL that only lives for the tab that picked the file — reopening the room
   * later has nothing else to fall back on without this.
   */
  slipUrl?: string | null;
  /** Heading and dialog title, for the refund and membership slips. */
  title?: string;
  /** Removes the extra card shell when the uploader already lives in a dialog. */
  embedded?: boolean;
  className?: string;
}

export function SlipUploader({
  amount,
  onUpload,
  isUploaded = false,
  uploadedAt,
  slipUrl,
  title,
  embedded = false,
  className,
}: SlipUploaderProps) {
  const t = getCopy();
  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * Picking a file used to send it. There was no beat between the two, so the
   * preview it set was decoration — by the time it painted, the upload was
   * already in flight and unrecallable. `pending` is what splits them: the file
   * sits here, visible, until the sender says go.
   */
  const [pending, setPending] = useState<{ file: File; url: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Object URLs are held by the document until they are revoked; a sender who
  // swaps through four screenshots looking for the right one leaks all four.
  const pendingUrl = pending?.url;
  useEffect(() => {
    if (!pendingUrl) return;
    return () => URL.revokeObjectURL(pendingUrl);
  }, [pendingUrl]);

  const heading = title ?? t("slip.upload");

  const choose = useCallback(() => {
    setError(null);
    inputRef.current?.click();
  }, []);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError(t("slip.errorNotImage"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("slip.errorTooLarge"));
      return;
    }
    setError(null);
    setSent(false);
    setPending({ file, url: URL.createObjectURL(file) });
  }

  async function send() {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onUpload(pending.file);
      // The preview stays on screen. The parent refetches the transaction and
      // hands back `slipUrl`, but that is a round trip; dropping the image in
      // the meantime would blank the card at the exact moment the sender is
      // looking for confirmation that it went.
      setSent(true);
    } catch {
      // Deliberately keeps `pending`. A failed upload used to clear the
      // preview, so retrying meant finding the screenshot again.
      setError(t("slip.errorUploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const displayed = pending?.url ?? slipUrl ?? null;
  const awaitingSend = !!pending && !sent;
  const showDropzone = !displayed && !isUploaded;

  return (
    <Surface
      shape="card"
      elevation={embedded ? "none" : "raised"}
      fill={embedded ? "none" : "surface"}
      className={cn(embedded ? "p-0" : "p-4", className)}
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[1.125rem] leading-[1.4] font-semibold">{heading}</h4>
        <span data-numeric className="shrink-0 whitespace-nowrap text-body-lg font-semibold">
          {formatAmount(amount)}
        </span>
      </header>

      {showDropzone ? (
        <button
          type="button"
          onClick={choose}
          className={cn(
            "flex w-full min-w-0 flex-col items-center gap-2 rounded-control px-4 py-6 sm:flex-row sm:gap-3 sm:py-4 sm:text-left",
            "border-2 border-dashed border-line-default bg-surface-sunken",
            "text-ink-muted transition-colors duration-[--dur-fast]",
            "hover:border-brand hover:bg-brand-subtle hover:text-ink-brand",
          )}
        >
          <ImagePlus aria-hidden className="size-7 shrink-0" />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-body font-medium">{t("slip.choose")}</span>
            <span className="text-caption">{t("slip.formats")}</span>
          </span>
        </button>
      ) : displayed ? (
        <SlipFrame
          src={displayed}
          alt={heading}
          title={heading}
          caption={formatAmount(amount)}
        />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Same file twice in a row fires no change event otherwise, which is
          // exactly what happens after a failed upload.
          e.target.value = "";
        }}
      />

      {awaitingSend ? (
        <>
          <p className="mt-3 text-body-sm text-ink-secondary">
            {t("slip.previewHint")}
          </p>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="secondary"
              block
              onPress={choose}
              isDisabled={busy}
            >
              <ImagePlus aria-hidden className="size-4" />
              {t("slip.change")}
            </Button>
            <Button variant="primary" block onPress={send} isLoading={busy}>
              {error ? (
                <RotateCcw aria-hidden className="size-4" />
              ) : (
                <Send aria-hidden className="size-4" />
              )}
              {error ? t("slip.retry") : t("slip.confirmSend")}
            </Button>
          </div>
        </>
      ) : null}

      {busy ? (
        <p role="status" className="mt-3 text-body-sm text-ink-muted">
          {t("slip.uploading")}
        </p>
      ) : null}

      {sent && !uploadedAt ? (
        <p className="mt-3 flex items-center gap-1.5 text-body-sm font-medium text-ink-brand">
          <Check aria-hidden className="size-4" />
          {t("slip.sent")}
        </p>
      ) : null}

      {uploadedAt ? <UploadedAt at={uploadedAt} labelKey="slip.uploadedAt" /> : null}

      {error ? (
        <p role="alert" className="mt-3 text-body-sm font-medium text-tone-danger-fg">
          {error}
        </p>
      ) : null}
    </Surface>
  );
}

export interface SlipReviewerProps {
  slipUrl: string;
  amount: number;
  buyer: { name: string; isVerified?: boolean };
  uploadedAt: string;
  onConfirm: () => void;
  onReject: () => void;
  isBusy?: boolean;
  className?: string;
}

/**
 * The receiver's side. Zoom matters more than it looks: a slip screenshot on a
 * phone is unreadable at card size, and a seller who cannot read the amount
 * will either confirm blindly or stall — both of which start the 24h clock
 * (research R2) for no reason.
 */
export function SlipReviewer({
  slipUrl,
  amount,
  buyer,
  uploadedAt,
  onConfirm,
  onReject,
  isBusy = false,
  className,
}: SlipReviewerProps) {
  const t = getCopy();

  return (
    <Surface shape="card" className={cn("p-4", className)}>
      <header className="mb-3 flex flex-col gap-2">
        <h4 className="text-[1.125rem] leading-[1.4] font-semibold">{t("slip.check")}</h4>
        <TrustBadge name={buyer.name} isVerified={buyer.isVerified} size="sm" />
      </header>

      <SlipFrame
        src={slipUrl}
        alt={t("slip.transferSlip")}
        title={t("slip.transferSlip")}
        caption={formatAmount(amount)}
      />

      <dl className="mt-3 flex items-baseline justify-between text-body-sm">
        <dt className="text-ink-muted">{t("slip.amountDue")}</dt>
        <dd data-numeric className="shrink-0 whitespace-nowrap text-body-lg font-semibold">
          {formatAmount(amount)}
        </dd>
      </dl>
      <UploadedAt at={uploadedAt} labelKey="slip.uploadedByBuyerAt" />

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="secondary" block onPress={onReject} isDisabled={isBusy}>
          <X className="size-4" />{t("slip.amountWrong")}</Button>
        <Button variant="primary" block onPress={onConfirm} isLoading={isBusy}>
          <Check className="size-4" />{t("slip.confirmReceived")}</Button>
      </div>
    </Surface>
  );
}
