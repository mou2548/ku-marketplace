"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "./button";
import { Overlay } from "./overlay";

/** The crop window on screen, and the size of the saved square. */
const VIEW = 280;
const OUTPUT = 512;
const MAX_ZOOM = 4;

interface Frame {
  zoom: number;
  x: number;
  y: number;
  /** Quarter turns clockwise. */
  turns: number;
}

const START: Frame = { zoom: 1, x: 0, y: 0, turns: 0 };

/**
 * Crop a chosen photo to the square the avatar shows, before it is uploaded.
 * Drag (or arrow keys) to move, slider, wheel or buttons to zoom, and rotate
 * a quarter turn at a time. The circle shows what the round avatar will keep.
 *
 * The result is drawn on a canvas with the same transform as the preview and
 * handed back as a JPEG `File`, so the upload path is unchanged.
 */
interface CropProps {
  /** The picked photo; the dialog is open while this is set. */
  file: File | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => Promise<void>;
}

export function AvatarCropDialog(props: CropProps) {
  // A new photo starts a fresh crop: position, zoom and rotation reset.
  const { file } = props;
  const key = file ? `${file.name}:${file.size}:${file.lastModified}` : "none";
  return <CropDialog key={key} {...props} />;
}

function CropDialog({ file, onCancel, onConfirm }: CropProps) {
  // Read as a data URL. An object URL created in render and revoked in an
  // effect cleanup is dead after React's dev double-mount, and the photo
  // never appeared.
  const [src, setSrc] = useState<string | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  useEffect(() => {
    if (!file) return;
    let live = true;
    const reader = new FileReader();
    reader.onload = () => {
      if (live && typeof reader.result === "string") setSrc(reader.result);
    };
    reader.onerror = () => {
      if (live) setUnreadable(true);
    };
    reader.readAsDataURL(file);
    return () => {
      live = false;
      reader.abort();
    };
  }, [file]);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<Frame>(START);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(
    null,
  );

  // Image size as it sits in the frame, after rotation.
  const sideways = frame.turns % 2 === 1;
  const w = size ? (sideways ? size.h : size.w) : 1;
  const h = size ? (sideways ? size.w : size.h) : 1;
  // "Cover" at zoom 1: the short side fills the window.
  const base = VIEW / Math.min(w, h);
  const scale = base * frame.zoom;

  /** Keep the photo covering the whole window, wherever it is dragged. */
  function clamp(next: Frame): Frame {
    const s = base * next.zoom;
    const maxX = Math.max(0, (w * s - VIEW) / 2);
    const maxY = Math.max(0, (h * s - VIEW) / 2);
    return {
      ...next,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  const setZoom = (zoom: number) =>
    setFrame((f) => clamp({ ...f, zoom: Math.min(MAX_ZOOM, Math.max(1, zoom)) }));

  async function confirm() {
    const img = imgRef.current;
    if (!img || !size || !file) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare the photo");
      const k = OUTPUT / VIEW;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      ctx.translate(OUTPUT / 2 + frame.x * k, OUTPUT / 2 + frame.y * k);
      ctx.rotate((frame.turns * Math.PI) / 2);
      ctx.scale(scale * k, scale * k);
      ctx.drawImage(img, -size.w / 2, -size.h / 2);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Could not prepare the photo");
      const name = file.name.replace(/\.[^.]+$/, "") || "avatar";
      await onConfirm(new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay
      title="Adjust your photo"
      description="Drag to position, zoom to fit. The circle is what others see."
      isOpen={file !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      isBusy={busy}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onPress={onCancel} isDisabled={busy}>
            Cancel
          </Button>
          <Button
            onPress={confirm}
            isLoading={busy}
            loadingLabel="Saving photo"
            isDisabled={!size}
          >
            {busy ? null : <Check className="size-4" />}
            {busy ? "Saving..." : "Use this photo"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 pb-2">
        <div
          role="application"
          aria-label="Photo position. Use arrow keys to move, plus and minus to zoom."
          tabIndex={0}
          className="relative cursor-grab touch-none select-none overflow-hidden rounded-[12px] bg-surface-sunken outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-brand"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, fx: frame.x, fy: frame.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            setFrame((f) =>
              clamp({ ...f, x: d.fx + e.clientX - d.x, y: d.fy + e.clientY - d.y }),
            );
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => setZoom(frame.zoom - e.deltaY * 0.0015)}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 20 : 6;
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, -step],
              ArrowDown: [0, step],
            };
            if (moves[e.key]) {
              e.preventDefault();
              const [dx, dy] = moves[e.key];
              setFrame((f) => clamp({ ...f, x: f.x + dx, y: f.y + dy }));
            } else if (e.key === "+" || e.key === "=") setZoom(frame.zoom + 0.1);
            else if (e.key === "-") setZoom(frame.zoom - 0.1);
          }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL, drawn to canvas
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) =>
                setSize({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              onError={() => setUnreadable(true)}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={
                size
                  ? {
                      width: size.w,
                      height: size.h,
                      transform: `translate(-50%, -50%) translate(${frame.x}px, ${frame.y}px) rotate(${frame.turns * 90}deg) scale(${scale})`,
                    }
                  : { opacity: 0 }
              }
            />
          ) : null}
          {unreadable ? (
            <p
              role="alert"
              className="absolute inset-x-6 top-1/2 z-[1] -translate-y-1/2 rounded-control bg-surface p-3 text-center text-body-sm text-tone-danger-fg"
            >
              This photo cannot be opened here. Choose a JPG or PNG.
            </p>
          ) : !size ? (
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 z-[1] size-8 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
            />
          ) : null}
          {/* Everything outside the circle is dimmed. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(0_0_0_/_0.45)] ring-2 ring-white/80"
          />
        </div>

        <div className="flex w-full items-center gap-2" style={{ maxWidth: VIEW }}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            onPress={() => setZoom(frame.zoom - 0.2)}
          >
            <ZoomOut className="size-4" />
          </Button>
          <input
            type="range"
            aria-label="Zoom"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={frame.zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="min-w-0 flex-1 accent-[var(--color-brand,#2e8f5a)]"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            onPress={() => setZoom(frame.zoom + 0.2)}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Rotate a quarter turn"
            onPress={() =>
              setFrame((f) => ({ ...START, turns: (f.turns + 1) % 4, zoom: f.zoom }))
            }
          >
            <RotateCw className="size-4" />
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
