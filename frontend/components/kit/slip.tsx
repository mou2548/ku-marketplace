"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, ImagePlus, X, ZoomIn } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
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
 */

export interface SlipUploaderProps {
  amount: number;
  onUpload: (file: File) => Promise<void>;
  isUploaded?: boolean;
  uploadedAt?: string | null;
  /**
   * The persisted slip, once the backend has one. `preview` (a local blob
   * URL) only lives for the tab that just uploaded it — reopening the room
   * later has nothing else to fall back on without this.
   */
  slipUrl?: string | null;
  className?: string;
}

export function SlipUploader({
  amount,
  onUpload,
  isUploaded = false,
  uploadedAt,
  slipUrl,
  className,
}: SlipUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("The file must be an image");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("The file is larger than 8 MB");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      await onUpload(file);
    } catch {
      setError("Upload failed. Try again.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface shape="card" className={cn("p-4", className)}>
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h4 className="text-[1.125rem] leading-[1.4] font-semibold">
          Upload your transfer slip
        </h4>
        <span data-numeric className="text-body-lg font-semibold">
          ฿{amount.toLocaleString("en-GB")}
        </span>
      </header>

      {preview || isUploaded ? (
        <a
          href={preview ?? slipUrl ?? undefined}
          target="_blank"
          rel="noreferrer"
          aria-label="View the full slip in a new tab"
          className={cn(
            "relative block aspect-[3/4] w-full overflow-hidden rounded-control bg-surface-sunken shadow-sunken",
            !preview && !slipUrl && "pointer-events-none",
          )}
        >
          {preview || slipUrl ? (
            <Image
              src={preview ?? slipUrl!}
              alt="Uploaded slip"
              fill
              sizes="(min-width: 640px) 24rem, 100vw"
              className="object-contain"
            />
          ) : null}
          {preview || slipUrl ? (
            <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-pill bg-surface-inverse/80 px-2 py-1.5 text-meta font-medium text-white">
              <ZoomIn aria-hidden className="size-3.5" />
              View full slip
            </span>
          ) : null}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-control px-4 py-10",
            "border-2 border-dashed border-line-default bg-surface-sunken",
            "text-ink-muted transition-colors duration-[--dur-fast]",
            "hover:border-brand hover:bg-brand-subtle hover:text-ink-brand",
          )}
        >
          <ImagePlus aria-hidden className="size-7" />
          <span className="text-body font-medium">
            Choose a slip image
          </span>
          <span className="text-caption">JPG or PNG, up to 8 MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {busy ? (
        <p className="mt-3 text-body-sm text-ink-muted">Uploading</p>
      ) : null}

      {uploadedAt ? (
        <p className="mt-3 text-caption leading-[1.5] text-ink-muted">
          Uploaded {" "}
          <time dateTime={uploadedAt}>
            {new Date(uploadedAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </p>
      ) : null}

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
 * The seller's side. Zoom matters more than it looks: a slip screenshot on a
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
  const [zoomed, setZoomed] = useState(false);

  return (
    <Surface shape="card" className={cn("p-4", className)}>
      <header className="mb-3 flex flex-col gap-2">
        <h4 className="text-[1.125rem] leading-[1.4] font-semibold">
          Check the slip and confirm payment
        </h4>
        <TrustBadge name={buyer.name} isVerified={buyer.isVerified} size="sm" />
      </header>

      <button
        type="button"
        onClick={() => setZoomed((z) => !z)}
        aria-label={zoomed ? "Shrink the slip" : "Enlarge the slip"}
        className={cn(
          "relative block w-full overflow-hidden rounded-control bg-surface-sunken shadow-sunken",
          zoomed ? "aspect-auto" : "aspect-[3/4]",
        )}
      >
        <Image
          src={slipUrl}
          alt="Transfer slip from the buyer"
          width={800}
          height={1100}
          className={cn("w-full", zoomed ? "h-auto" : "h-full object-contain")}
        />
        <span className="absolute right-2 bottom-2 rounded-pill bg-surface-inverse/80 p-2 text-white">
          <ZoomIn aria-hidden className="size-4" />
        </span>
      </button>

      <dl className="mt-3 flex items-baseline justify-between text-body-sm">
        <dt className="text-ink-muted">Amount due</dt>
        <dd data-numeric className="text-body-lg font-semibold">
          ฿{amount.toLocaleString("en-GB")}
        </dd>
      </dl>
      <p className="mt-1 text-caption text-ink-muted">
        Buyer uploaded {" "}
        <time dateTime={uploadedAt}>
          {new Date(uploadedAt).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </p>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="secondary" block onPress={onReject} isDisabled={isBusy}>
          <X className="size-4" />
          Amount is wrong
        </Button>
        <Button variant="primary" block onPress={onConfirm} isLoading={isBusy}>
          <Check className="size-4" />
          Confirm payment received
        </Button>
      </div>
    </Surface>
  );
}
