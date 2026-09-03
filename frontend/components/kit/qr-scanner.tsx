"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, ScanLine } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

/**
 * The scanning half of the handover (design principle 7). Full screen, no
 * chrome — this is the moment the whole transaction exists for.
 *
 * Detection uses the platform `BarcodeDetector` where available and falls back
 * to manual code entry everywhere else. A ~250 KB JS decoder would eat the
 * entire route budget (CLAUDE.md §7) for a screen that is used once per deal,
 * and a handover that cannot proceed because a polyfill failed is worse than
 * typing six characters.
 */

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): BarcodeDetectorLike;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

export interface QrScannerProps {
  /** Called with the decoded token. Wired to POST /…/qr/scan by the page. */
  onScan: (token: string) => void | Promise<void>;
  title?: string;
  hint?: string;
  className?: string;
}

export function QrScanner({
  onScan,
  title = "Scan the QR to confirm handover",
  hint = "Point the camera at the other person's QR code",
  className,
}: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "running" | "denied" | "unsupported">(
    "idle",
  );
  const [manual, setManual] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      if (typeof window === "undefined" || !window.BarcodeDetector) {
        setStatus("unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("running");

        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found.length > 0) {
              stopped = true;
              await onScan(found[0].rawValue);
              return;
            }
          } catch {
            // A frame that fails to decode is normal; keep looking.
          }
          raf = requestAnimationFrame(() => void tick());
        };
        raf = requestAnimationFrame(() => void tick());
      } catch {
        if (!stopped) setStatus("denied");
      }
    }

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div
      className={cn(
        "relative flex min-h-dvh flex-col items-center justify-center gap-5 bg-surface-inverse p-6 text-white",
        className,
      )}
    >
      <h1 className="text-center text-[1.25rem] leading-[1.3] font-semibold">
        {title}
      </h1>

      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-panel bg-black/40">
        <video
          ref={videoRef}
          playsInline
          muted
          className="size-full object-cover"
        />

        {/* Reticle */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-8 rounded-panel border-2 border-white/70"
        />
        {status === "running" ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-8 h-0.5 animate-pulse bg-brand"
          />
        ) : null}

        {status !== "running" ? (
          <span className="absolute inset-0 grid place-items-center bg-black/70 text-white">
            {status === "denied" ? (
              <CameraOff aria-hidden className="size-8" />
            ) : (
              <ScanLine aria-hidden className="size-8" />
            )}
          </span>
        ) : null}
      </div>

      <p className="max-w-xs text-center text-body-sm text-white">
        {status === "denied"
          ? "The camera is unavailable. Type the code from the QR instead."
          : status === "unsupported"
            ? "This device cannot scan automatically. Type the code from the QR instead."
            : hint}
      </p>

      {status === "denied" || status === "unsupported" ? (
        <form
          className="flex w-full max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) void onScan(manual.trim());
          }}
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type the code from the QR"
            aria-label="Type the code from the QR"
            className="h-12 flex-1 rounded-control bg-white/10 px-3.5 text-body text-white placeholder:text-white/70"
          />
          <Button type="submit" isDisabled={!manual.trim()}>
            Confirm
          </Button>
        </form>
      ) : null}
    </div>
  );
}
