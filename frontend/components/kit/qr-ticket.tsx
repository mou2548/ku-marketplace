"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import { TICKET_ROTATION_MS } from "@/lib/status";
import { UNKNOWN_TIME, useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/**
 * Research risk R8. A giveaway ticket's QR rotates every 15 minutes. That is a
 * security control the receiver never asked for, and if it silently expires
 * mid-handover it reads as a bug — the single most likely moment for a student
 * to lose trust in the product.
 *
 * So: the ring shows the remaining life of the current code, the code refreshes
 * itself without the user doing anything, and one line explains why it changes.
 * A dead QR is never displayed.
 *
 * Two modes:
 *   default (`once` false) — giveaway tickets: re-issue a fresh code every
 *     `periodMs` on its own.
 *   `once` — the deal handover: issue ONE code and count it down. There is one
 *     code per 15-minute window server-side (`generateQr` hands back the same
 *     token with the time it has left), so closing and reopening keeps the same
 *     countdown; only after it expires does reopening mint a new one.
 *
 * Design principle 7: the handover is the climax. This component gets the whole
 * screen and no chrome around it.
 */
/** What `onGenerate` may return: a bare token, or a token with its server-side
 * remaining lifetime (used to seed the countdown so it survives a remount). */
export type QrIssue = { token: string; expiresInSeconds?: number };

export interface QrTicketProps {
  /** Fetches a token. Wired to POST /…/qr/generate by the page. */
  onGenerate: () => Promise<string | QrIssue>;
  /** Rotation period. Defaults to the 15 minutes the flow specifies. */
  periodMs?: number;
  /**
   * Issue one code and let it count down instead of auto-rotating. For the deal
   * handover, where the server already caps it at one code per 15 minutes.
   */
  once?: boolean;
  /**
   * The label was hardcoded to the giveaway wording while `deal-qr.tsx`
   * reuses this component for a transaction handover, so a screen-reader user
   * closing a purchase was told they were collecting a giveaway item.
   */
  ariaLabel?: string;
  caption?: string;
  className?: string;
}

const SIZE = 264;

export function QrTicket({
  onGenerate,
  periodMs = TICKET_ROTATION_MS,
  once = false,
  ariaLabel = "QR code for collecting your giveaway item",
  caption = once
    ? "One code per 15 minutes. If it expires, close this and open it again for a new one."
    : "This code refreshes every 15 minutes for security. You do not need to do anything.",
  className,
}: QrTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep the newest onGenerate without making it an effect dependency: callers
  // that pass an inline arrow would otherwise restart the whole rotation loop
  // on every parent render, re-issuing a token every render instead of every
  // `periodMs`.
  const onGenerateRef = useRef(onGenerate);
  useEffect(() => {
    onGenerateRef.current = onGenerate;
  }, [onGenerate]);
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
  // The life of the code currently drawn. Seeded from the server's remaining
  // TTL when it gives one, so a reopened QR keeps counting the original window
  // down rather than restarting at a full 15 minutes.
  const [windowMs, setWindowMs] = useState(periodMs);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(1000);

  // One effect owns the whole rotation loop: issue a code, draw it, then queue
  // the next issue a few seconds before this one dies. Chaining it through
  // state would mean a render between every rotation for no reason.
  //
  // Every setState below happens after an await — this is a subscription to an
  // external system (the token endpoint), not a synchronous cascade.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function cycle() {
      try {
        const issued = await onGenerateRef.current();
        if (cancelled) return;
        const token = typeof issued === "string" ? issued : issued.token;
        const lifeMs =
          typeof issued === "string" || issued.expiresInSeconds == null
            ? periodMs
            : Math.max(0, issued.expiresInSeconds * 1_000);
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, token, {
            width: SIZE,
            margin: 1,
            color: { dark: "#122b1d", light: "#ffffff" },
          });
        }
        if (cancelled) return;
        setIssuedAt(Date.now());
        setWindowMs(lifeMs || periodMs);
        setError(null);
        // `once`: no self-scheduled re-issue. The code counts down and, when it
        // runs out, the user reopens to get the next one.
        if (!once && lifeMs > 5_000) {
          timer = setTimeout(() => void cycle(), lifeMs - 5_000);
        }
      } catch {
        if (!cancelled) setError("Could not generate a code. Try again.");
      }
    }

    void cycle();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // onGenerate is read through a ref so a new function identity does not
    // restart the loop; only the rotation period or the mode changes it.
  }, [periodMs, once]);

  const elapsed =
    issuedAt === null || now === UNKNOWN_TIME ? 0 : now - issuedAt;
  const remainingMs = Math.max(0, windowMs - elapsed);
  const expired = issuedAt !== null && remainingMs === 0;

  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="grid place-items-center">
        {/* Remaining life is shown as the "Valid for m:ss" line below — no ring
            around the code in either mode. */}
        <div className="rounded-panel bg-white p-4 shadow-floating">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            role="img"
            aria-label={ariaLabel}
            className={cn(
              "block size-[264px] transition-opacity",
              expired && "opacity-30",
            )}
          />
        </div>
      </div>

      {expired ? (
        <p
          role="alert"
          className="text-body-lg leading-[1.4] font-semibold text-tone-warning-fg"
        >
          Code expired
        </p>
      ) : (
        <p
          data-numeric
          aria-live="polite"
          className="text-body-lg leading-[1.4] font-semibold"
          suppressHydrationWarning
        >
          Valid for {minutes}:{String(seconds).padStart(2, "0")}
        </p>
      )}

      <p className="max-w-xs text-center text-caption leading-[1.6] text-ink-muted">
        {caption}
      </p>

      {error ? (
        <p role="alert" className="text-body-sm font-medium text-tone-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
