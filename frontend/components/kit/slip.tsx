"use client";

import { formatDateTime } from "@/lib/date-format";
import { formatPrice } from "@/lib/format-price";


import { getCopy } from "@/lib/copy";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button as AriaButton } from "react-aria-components";
import { AlertTriangle, Check, ImagePlus, RotateCcw, Send, X, ZoomIn } from "lucide-react";

import { isDecodableImage } from "@/lib/image-check";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_BEFORE_CONVERT_BYTES,
  needsConversion,
  prepareImageForUpload,
} from "@/lib/image-prepare";
import { cn } from "@/lib/utils";

import { Notice } from "@/components/patterns/notice";

import { Button } from "./button";
import { TextAreaField } from "./field";
import { Overlay } from "./overlay";
import { PhotoViewer, PhotoViewerTrigger } from "./photo-viewer";
import { ImagePlate } from "./post-image";
import { Surface } from "./surface";
import { useToast } from "./toast";
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

/**
 * `next/image` refuses any src that is neither a rooted path nor an http(s)
 * URL, and its optimizer has to fetch the bytes server-side to resize them. A
 * `blob:` object URL fails both counts: it is not a parseable remote URL, and
 * it only exists inside the tab that created it. So the local preview — the
 * whole point of looking at a slip before sending it — renders as a plain
 * <img>, and only persisted slips go through next/image.
 */
function SlipImage({
  src,
  alt,
  onError,
}: {
  src: string;
  alt: string;
  onError: () => void;
}) {
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 size-full object-contain"
        onError={onError}
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
      onError={onError}
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
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const frame = cn(
    "relative block w-full overflow-hidden rounded-control bg-surface-sunken shadow-sunken",
    size === "tall" ? "h-[min(28rem,50dvh)]" : "h-[min(16rem,35dvh)]",
    className,
  );

  // A slip that fails to load showed the browser's broken-image icon and the
  // alt text in an empty box, and the viewer behind it showed the same
  // (retest R04). It gets the card photo's plate in the box it reserved,
  // and nothing to open.
  if (failedSrc === src) {
    return (
      <div className={frame}>
        <ImagePlate failed label={t("slip.unavailable")} />
      </div>
    );
  }

  return (
    <PhotoViewerTrigger>
      <AriaButton aria-label={t("slip.viewFullscreen")} className={frame}>
        <SlipImage src={src} alt={alt} onError={() => setFailedSrc(src)} />
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
            {formatPrice(amount)}
          </span>
        ) : null}
      </header>

      <SlipFrame
        src={slipUrl}
        alt={heading}
        title={heading}
        caption={amount !== undefined ? formatPrice(amount) : undefined}
      />

      {uploadedAt ? <UploadedAt at={uploadedAt} labelKey="slip.uploadedAt" /> : null}
    </Surface>
  );
}

export interface SlipUploaderProps {
  /**
   * Shown beside the heading. Omitted when the sum is not known — a refund
   * after a rejected slip returns whatever arrived, not the deal total.
   */
  amount?: number;
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
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
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
  /** The API's own reason for a failed upload, under the generic sentence. */
  const [reason, setReason] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  /**
   * Bumped on every pick. Decoding is async, so a second pick made while the
   * first is still decoding would otherwise race it: whichever finished last
   * won, and whichever finished first cleared `checking` early. Only the
   * latest pick may touch state.
   */
  const pickRef = useRef(0);

  // At 390px the slip preview is taller than the space the action card gets,
  // so an error rendered below it was off screen (audit B03). Bring it in.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "nearest" });
  }, [error]);

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
    setReason(null);
    inputRef.current?.click();
  }, []);

  async function handleFile(file: File) {
    const pick = ++pickRef.current;
    // A GIF or SVG becomes a PNG before it is sent, so its size is judged after
    // that; the ceiling here only stops a huge file being decoded at all.
    const limit = needsConversion(file) ? MAX_BEFORE_CONVERT_BYTES : MAX_BYTES;
    if (file.size > limit) {
      setChecking(false);
      setError(t("slip.errorTooLarge"));
      return;
    }
    // The MIME type comes from the file name; only decoding reads the bytes
    // (audit B04), so a renamed text file never previews as a slip.
    setChecking(true);
    const isImage = await isDecodableImage(file);
    if (pick !== pickRef.current) return;
    let ready: File | null = null;
    if (isImage) {
      try {
        ready = await prepareImageForUpload(file);
      } catch {
        ready = null;
      }
      if (pick !== pickRef.current) return;
    }
    setChecking(false);
    if (!ready) {
      setError(t("slip.errorNotImage"));
      return;
    }
    if (ready.size > MAX_BYTES) {
      setError(t("slip.errorTooLarge"));
      return;
    }
    setError(null);
    setReason(null);
    setSent(false);
    setPending({ file: ready, url: URL.createObjectURL(ready) });
  }

  async function send() {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    setReason(null);
    try {
      await onUpload(pending.file);
      // The preview stays on screen. The parent refetches the transaction and
      // hands back `slipUrl`, but that is a round trip; dropping the image in
      // the meantime would blank the card at the exact moment the sender is
      // looking for confirmation that it went.
      setSent(true);
    } catch (err) {
      // Deliberately keeps `pending`. A failed upload used to clear the
      // preview, so retrying meant finding the screenshot again.
      const why = err instanceof Error && err.message ? err.message : null;
      setError(t("slip.errorUploadFailed"));
      setReason(why);
      // Also a toast: the inline line can sit below a tall preview.
      toast.error(why ?? t("slip.errorUploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const errorLine = error ? (
    <div
      ref={errorRef}
      role="alert"
      className="mt-3 flex scroll-mb-4 items-start gap-2 text-body-sm font-medium text-tone-danger-fg"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span>{error}</span>
        {reason && reason !== error ? (
          <span className="font-normal break-words">{reason}</span>
        ) : null}
      </span>
    </div>
  ) : null;

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
        {amount !== undefined ? (
          <span data-numeric className="shrink-0 whitespace-nowrap text-body-lg font-semibold">
            {formatPrice(amount)}
          </span>
        ) : null}
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
          caption={amount !== undefined ? formatPrice(amount) : undefined}
        />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        hidden
        aria-label={t("slip.choose")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          // Same file twice in a row fires no change event otherwise, which is
          // exactly what happens after a failed upload.
          e.target.value = "";
        }}
      />

      {checking ? (
        <p role="status" className="mt-3 text-body-sm text-ink-muted">
          {t("slip.errorChecking")}
        </p>
      ) : null}

      {awaitingSend ? (
        <>
          {error ? (
            errorLine
          ) : (
            <p className="mt-3 text-body-sm text-ink-secondary">
              {t("slip.previewHint")}
            </p>
          )}
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
            <Button variant="primary" block onPress={send} isLoading={busy} isDisabled={checking}>
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

      {/* A picking error with no preview yet has no button row to sit beside. */}
      {error && !awaitingSend ? errorLine : null}
    </Surface>
  );
}

export interface SlipReviewerProps {
  slipUrl: string;
  amount: number;
  buyer: { name: string; isVerified?: boolean; avatar_url?: string | null };
  uploadedAt: string;
  onConfirm: () => void;
  onReject: () => void;
  isBusy?: boolean;
  /** Heading; defaults to the deal wording ("Check the slip and confirm payment"). */
  title?: string;
  /** "buyer" labels the time "Buyer uploaded"; "plain" says "Uploaded" for slips that are not from a deal. */
  uploader?: "buyer" | "plain";
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
  title,
  uploader = "buyer",
  className,
}: SlipReviewerProps) {
  const t = getCopy();

  return (
    <Surface shape="card" className={cn("@container p-4", className)}>
      <header className="mb-3 flex flex-col gap-2">
        <h4 className="text-[1.125rem] leading-[1.4] font-semibold">{title ?? t("slip.check")}</h4>
        <TrustBadge name={buyer.name} isVerified={buyer.isVerified} avatarUrl={buyer.avatar_url} size="sm" />
      </header>

      {/* The slip beside the decision once the card is wide enough, so the
          buttons are not pushed below a tall image. Keyed to the card's own
          width, not the screen's: this also renders in the admin queue. */}
      <div className="flex flex-col @xl:grid @xl:grid-cols-2 @xl:items-center @xl:gap-5">
        <SlipFrame
          src={slipUrl}
          alt={t("slip.transferSlip")}
          title={t("slip.transferSlip")}
          caption={formatPrice(amount)}
        />

        <div className="flex flex-col">
          <dl className="mt-3 flex items-baseline justify-between text-body-sm @xl:mt-0">
            <dt className="text-ink-muted">{t("slip.amountDue")}</dt>
            <dd data-numeric className="shrink-0 whitespace-nowrap text-body-lg font-semibold">
              {formatPrice(amount)}
            </dd>
          </dl>
          <UploadedAt
            at={uploadedAt}
            labelKey={uploader === "buyer" ? "slip.uploadedByBuyerAt" : "slip.uploadedAt"}
          />

          {/* Side by side only when the card itself has room: button labels
              no longer wrap (quiet badges), and in the admin queue the card
              is narrow even on a wide screen. */}
          <div className="mt-4 flex flex-col-reverse gap-2 @md:flex-row">
            <Button variant="secondary" block onPress={onReject} isDisabled={isBusy}>
              <X className="size-4" />{t("slip.amountWrong")}</Button>
            <Button variant="primary" block onPress={onConfirm} isLoading={isBusy}>
              <Check className="size-4" />{t("slip.confirmReceived")}</Button>
          </div>
        </div>
      </div>
    </Surface>
  );
}

/**
 * `Transaction_Payment.rejection_reason` and
 * `Subscription_Payment.rejection_reason` are both VARCHAR(500); the API
 * checks it too.
 */
export const SLIP_REJECT_REASON_MAX = 500;

/**
 * The seller's "Amount is wrong", as a decision with a reason attached.
 *
 * The reason is required (the API refuses a blank one) because it is the only
 * thing the buyer gets back: without it they would be told "rejected" and
 * left to guess whether to transfer again, top up, or wait for a refund.
 * Closing waits for `onReject` to resolve, so a failed request keeps the typed
 * reason and the dialog open beside the error toast.
 */
export function SlipRejectDialog({
  isOpen,
  onOpenChange,
  isBusy = false,
  onReject,
  title,
  description,
  label,
  placeholder,
  hint,
  keepLabel,
  submitLabel,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isBusy?: boolean;
  /** Resolves `true` once the API accepted the rejection. */
  onReject: (reason: string) => Promise<boolean>;
  /** The wording below defaults to the deal slip; membership passes its own. */
  title?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  /** Under the field, given the typed length and the limit. */
  hint?: (count: number, max: number) => string;
  keepLabel?: string;
  submitLabel?: string;
}) {
  const t = getCopy("slip");
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  return (
    <Overlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isBusy={isBusy}
      title={title ?? t("rejectTitle")}
      description={description ?? t("rejectBody")}
      footer={
        <>
          <Button variant="ghost" slot="close" isDisabled={isBusy}>
            {keepLabel ?? t("rejectKeep")}
          </Button>
          <Button
            variant="danger"
            isLoading={isBusy}
            isDisabled={trimmed.length === 0 || trimmed.length > SLIP_REJECT_REASON_MAX}
            onPress={async () => {
              if (await onReject(trimmed)) {
                setReason("");
                onOpenChange(false);
              }
            }}
          >
            {submitLabel ?? t("rejectSend")}
          </Button>
        </>
      }
    >
      <TextAreaField
        label={label ?? t("rejectReason")}
        value={reason}
        onChange={setReason}
        isRequired
        maxLength={SLIP_REJECT_REASON_MAX}
        rows={3}
        placeholder={placeholder ?? t("rejectPlaceholder")}
        hint={
          hint
            ? hint(reason.length, SLIP_REJECT_REASON_MAX)
            : t("rejectHint", { count: reason.length, max: SLIP_REJECT_REASON_MAX })
        }
      />
    </Overlay>
  );
}

/**
 * What the buyer sees above the uploader after a rejection: that it happened,
 * and the seller's words for why, so the next slip fixes the right thing.
 */
export function SlipRejectedNotice({
  reason,
  className,
}: {
  /** `null` for a rejection made before the API stored reasons. */
  reason?: string | null;
  className?: string;
}) {
  const t = getCopy("slip");
  return (
    <Notice tone="danger" icon={AlertTriangle} className={className}>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body-sm font-semibold">{t("rejectedTitle")}</p>
        <p className="text-body-sm break-words">
          {reason ? reason : t("rejectedNoReason")}
        </p>
        <p className="text-caption">{t("rejectedNext")}</p>
      </div>
    </Notice>
  );
}
