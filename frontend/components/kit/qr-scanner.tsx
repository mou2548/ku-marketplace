"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, ScanLine } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";

/**
 * The scanning half of the handover (design principle 7). Full screen, no
 * chrome — this is the moment the whole transaction exists for.
 *
 * Detection uses the platform `BarcodeDetector` where it reads QR codes
 * (Chrome on Android and macOS). iOS, Firefox and desktop Chrome on
 * Windows/Linux have none, so they load the `barcode-detector` ponyfill
 * (zxing-wasm) on demand: it costs nothing on the routes that never scan, and
 * the .wasm is served from this app rather than a CDN. There is no typing
 * fallback: the token is 64 hex characters and is never shown as text.
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

async function createDetector(): Promise<BarcodeDetectorLike> {
  const Native = window.BarcodeDetector;
  if (Native && (await Native.getSupportedFormats?.())?.includes("qr_code")) {
    return new Native({ formats: ["qr_code"] });
  }
  const { BarcodeDetector, prepareZXingModule, ZXING_WASM_VERSION } = await import(
    "barcode-detector/ponyfill"
  );
  // Served from this app (scripts/copy-zxing-wasm.mjs) rather than jsDelivr.
  // Loaded now rather than on the first frame: a missing .wasm would otherwise
  // reject every detect() call, which the frame loop treats as "no QR yet".
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? `/zxing/zxing_reader-${ZXING_WASM_VERSION}.wasm` : prefix + path,
    },
    fireImmediately: true,
  });
  return new BarcodeDetector({ formats: ["qr_code"] });
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

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      // No mediaDevices at all means an insecure (http) origin or a browser
      // without camera access; neither can be fixed from this page.
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }
      let detector: BarcodeDetectorLike;
      try {
        detector = await createDetector();
      } catch {
        if (!stopped) setStatus("unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        // Left while the permission prompt or decoder load was pending: the
        // cleanup ran with no stream to stop, so stop it here.
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("running");

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
        "relative flex min-h-dvh flex-col items-center justify-center gap-5 bg-immersive p-6 text-white",
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
          ? "Camera access is blocked. Allow it for this site in your browser settings, then reload this page."
          : status === "unsupported"
            ? "The camera cannot open here. Use Chrome or Safari, and check that the address starts with https."
            : hint}
      </p>

      {status === "denied" || status === "unsupported" ? (
        <Button variant="secondary" onPress={() => window.location.reload()}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
