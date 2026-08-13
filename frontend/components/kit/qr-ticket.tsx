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
 * Design principle 7: the handover is the climax. This component gets the whole
 * screen and no chrome around it.
 */
export interface QrTicketProps {
  /** Fetches a fresh token. Wired to POST /…/qr/generate by the page. */
  onGenerate: () => Promise<string>;
  /** Rotation period. Defaults to the 15 minutes the flow specifies. */
  periodMs?: number;
  caption?: string;
  className?: string;
}

const SIZE = 264;

export function QrTicket({
  onGenerate,
  periodMs = TICKET_ROTATION_MS,
  caption = "This code refreshes every 15 minutes for security. You do not need to do anything.",
  className,
}: QrTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [issuedAt, setIssuedAt] = useState<number | null>(null);
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
        const token = await onGenerate();
        if (cancelled) return;
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, token, {
            width: SIZE,
            margin: 1,
            color: { dark: "#122b1d", light: "#ffffff" },
          });
        }
        if (cancelled) return;
        setIssuedAt(Date.now());
        setError(null);
        timer = setTimeout(() => void cycle(), periodMs - 5_000);
      } catch {
        if (!cancelled) setError("Could not generate a code. Try again.");
      }
    }

    void cycle();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onGenerate, periodMs]);

  const elapsed =
    issuedAt === null || now === UNKNOWN_TIME ? 0 : now - issuedAt;
  const remainingMs = Math.max(0, periodMs - elapsed);
  const progress = issuedAt === null ? 1 : remainingMs / periodMs;

  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);

  const R = 130;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative grid place-items-center">
        {/* Countdown ring. aria-hidden — the text below is the accessible copy. */}
        <svg
          aria-hidden
          viewBox="0 0 280 280"
          className="absolute size-[296px] -rotate-90"
        >
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke="var(--gray-200)"
            strokeWidth="6"
          />
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke={
              remainingMs < 60_000
                ? "var(--tone-warning-solid)"
                : "var(--brand)"
            }
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>

        <div className="rounded-panel bg-white p-4 shadow-floating">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            role="img"
            aria-label="QR code for collecting your giveaway item"
            className="block size-[264px]"
          />
        </div>
      </div>

      <p
        data-numeric
        aria-live="polite"
        className="text-[1.0625rem] leading-[1.4] font-semibold"
        suppressHydrationWarning
      >
        Valid for {minutes}:{String(seconds).padStart(2, "0")}
      </p>

      <p className="max-w-xs text-center text-[0.8125rem] leading-[1.6] text-ink-muted">
        {caption}
      </p>

      {error ? (
        <p role="alert" className="text-[0.875rem] font-medium text-tone-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
