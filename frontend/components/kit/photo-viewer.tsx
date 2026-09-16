"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { Maximize, Minus, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A full-screen photo viewer with the gestures people already have in their
 * hands: pinch to zoom, double-tap to snap in and out, drag to pan, swipe down
 * to put it away.
 *
 * It exists because of the payment slip. A bank screenshot is a tall portrait
 * image whose whole payload is small text — an amount, a reference, a
 * timestamp — and the previous lightbox rendered it `object-contain` inside a
 * 68dvh box, which on a 360px phone spends barely half the screen width on the
 * thing the viewer came to read. The escape hatch was "open in a new tab",
 * which on a phone means leaving the app and losing the conversation.
 *
 * Nothing here is slip-specific, so the chat thread's photos use it too.
 *
 * The background is blurred rather than blacked out: the deal stays visible
 * behind the image, so the viewer keeps their place in the conversation.
 */

const MIN_SCALE = 1;
const MAX_SCALE = 5;
/** Where a double-tap lands. Enough to read a slip's amount on a phone. */
const TAP_SCALE = 2.5;
const DISMISS_AT = 120;
const STEP = 1.4;

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * All the state lives here rather than in `PhotoViewer` so that it mounts with
 * the dialog: reopening a photo should start at 1x, not wherever the last look
 * left it.
 */
function PhotoStage({
  src,
  alt,
  title,
  caption,
  close,
}: {
  src: string;
  alt: string;
  title: string;
  caption?: string;
  close: () => void;
}) {
  const t = useTranslations();
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [view, setView] = useState<Transform>(IDENTITY);
  /** Downward drag at 1x, which means dismiss rather than pan. */
  const [pull, setPull] = useState(0);
  const [gesturing, setGesturing] = useState(false);
  /** The image's on-screen size at 1x, which is what bounds panning. */
  const [box, setBox] = useState({ w: 0, h: 0 });

  // Pointer bookkeeping is refs, not state: it changes on every pointermove
  // and none of it is rendered.
  const viewRef = useRef<Transform>(IDENTITY);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const origin = useRef<{
    spread: number;
    x: number;
    y: number;
    view: Transform;
  } | null>(null);
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);
  const dragged = useRef(false);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image?.naturalWidth) return;
    const fit = Math.min(
      stage.clientWidth / image.naturalWidth,
      stage.clientHeight / image.naturalHeight,
    );
    setBox({ w: image.naturalWidth * fit, h: image.naturalHeight * fit });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  /**
   * Pan only as far as there is image hidden past the edge. At 1x there is
   * none, which is what frees a one-finger drag to mean "dismiss".
   */
  const commit = useCallback(
    (next: Transform) => {
      const stage = stageRef.current;
      const scale = clampScale(next.scale);
      let settled: Transform = { scale, x: 0, y: 0 };
      if (stage && scale > 1) {
        const maxX = Math.max(0, (box.w * scale - stage.clientWidth) / 2);
        const maxY = Math.max(0, (box.h * scale - stage.clientHeight) / 2);
        settled = {
          scale,
          x: Math.min(maxX, Math.max(-maxX, next.x)),
          y: Math.min(maxY, Math.max(-maxY, next.y)),
        };
      }
      viewRef.current = settled;
      setView(settled);
    },
    [box.w, box.h],
  );

  /**
   * Zoom about a point instead of the centre. Pinching or double-tapping the
   * amount on a slip has to keep the amount under the finger, or the reader
   * has to hunt for it again at every step.
   */
  const zoomAt = useCallback(
    (scale: number, clientX: number, clientY: number, from = viewRef.current) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const px = clientX - rect.left - rect.width / 2;
      const py = clientY - rect.top - rect.height / 2;
      const next = clampScale(scale);
      const factor = next / from.scale;
      commit({
        scale: next,
        x: px - (px - from.x) * factor,
        y: py - (py - from.y) * factor,
      });
    },
    [commit],
  );

  const zoomFromCentre = useCallback(
    (scale: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      zoomAt(scale, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [zoomAt],
  );

  // React's onWheel is passive, so the browser would zoom the whole page out
  // from under the image. This one can call preventDefault.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? STEP : 1 / STEP;
      zoomAt(viewRef.current.scale * factor, event.clientX, event.clientY);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function trackDown(event: React.PointerEvent) {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragged.current = false;
    setGesturing(true);

    const points = [...pointers.current.values()];
    origin.current =
      points.length >= 2
        ? {
            spread: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
            x: (points[0].x + points[1].x) / 2,
            y: (points[0].y + points[1].y) / 2,
            view: viewRef.current,
          }
        : { spread: 0, x: event.clientX, y: event.clientY, view: viewRef.current };
  }

  function trackMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = origin.current;
    if (!start) return;

    const points = [...pointers.current.values()];
    if (points.length >= 2) {
      if (!start.spread) return;
      dragged.current = true;
      const spread = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      zoomAt(
        start.view.scale * (spread / start.spread),
        start.x,
        start.y,
        start.view,
      );
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > 8) dragged.current = true;

    if (start.view.scale > 1) {
      commit({
        scale: start.view.scale,
        x: start.view.x + dx,
        y: start.view.y + dy,
      });
    } else if (dy > 0) {
      setPull(dy);
    }
  }

  function trackUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);

    if (pointers.current.size > 0) {
      // A finger lifted mid-pinch. Re-anchor on the one still down so the
      // image does not jump as the gesture turns into a pan.
      const [remaining] = [...pointers.current.values()];
      origin.current = {
        spread: 0,
        x: remaining.x,
        y: remaining.y,
        view: viewRef.current,
      };
      return;
    }

    setGesturing(false);
    origin.current = null;

    if (pull > DISMISS_AT) {
      close();
      return;
    }
    setPull(0);

    if (dragged.current) return;
    const now = Date.now();
    const previous = lastTap.current;
    if (
      previous &&
      now - previous.at < 320 &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 32
    ) {
      lastTap.current = null;
      zoomAt(
        viewRef.current.scale > 1 ? MIN_SCALE : TAP_SCALE,
        event.clientX,
        event.clientY,
      );
      return;
    }
    lastTap.current = { at: now, x: event.clientX, y: event.clientY };
  }

  /** CLAUDE.md section 6: every gesture needs a keyboard path beside it. */
  function onKeyDown(event: React.KeyboardEvent) {
    const pan = 48;
    const current = viewRef.current;
    const keys: Record<string, () => void> = {
      "+": () => zoomFromCentre(current.scale * STEP),
      "=": () => zoomFromCentre(current.scale * STEP),
      "-": () => zoomFromCentre(current.scale / STEP),
      "0": () => commit(IDENTITY),
      ArrowLeft: () => commit({ ...current, x: current.x + pan }),
      ArrowRight: () => commit({ ...current, x: current.x - pan }),
      ArrowUp: () => commit({ ...current, y: current.y + pan }),
      ArrowDown: () => commit({ ...current, y: current.y - pan }),
    };
    const handler = keys[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  }

  const zoomed = view.scale > 1;
  const chrome =
    "flex items-center justify-center rounded-pill bg-surface-inverse/70 text-white backdrop-blur-sm transition-opacity duration-[--dur-fast] hover:bg-surface-inverse/85 disabled:opacity-40";

  return (
    <>
      <header
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3",
          "bg-gradient-to-b from-surface-inverse/65 to-transparent",
          "p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10",
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-white">{title}</p>
          {caption ? (
            <p className="truncate text-caption text-white/80">{caption}</p>
          ) : null}
        </div>
        <AriaButton
          onPress={close}
          aria-label={t("photo.close")}
          className={cn(chrome, "pointer-events-auto size-11 shrink-0")}
        >
          <X aria-hidden className="size-5" />
        </AriaButton>
      </header>

      <div
        ref={stageRef}
        // The browser must not claim the touch for its own scroll or zoom, or
        // none of the pointer events below ever arrive.
        style={{ touchAction: "none" }}
        className="relative flex-1 overflow-hidden outline-none"
        tabIndex={0}
        role="group"
        aria-label={alt}
        onKeyDown={onKeyDown}
        onPointerDown={trackDown}
        onPointerMove={trackMove}
        onPointerUp={trackUp}
        onPointerCancel={trackUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center will-change-transform"
          style={{
            transform: `translate3d(${view.x}px, ${view.y + pull}px, 0) scale(${view.scale})`,
            transition: gesturing
              ? "none"
              : "transform var(--dur-base) var(--ease-out)",
            opacity: pull ? Math.max(0.35, 1 - pull / 420) : 1,
          }}
        >
          {/* A plain <img>: the source can be a blob: preview, which next/image
              rejects outright, and the optimizer has nothing to add to an image
              the viewer is about to magnify anyway. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            draggable={false}
            onLoad={measure}
            className="max-h-full max-w-full object-contain select-none"
          />
        </div>
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 p-4 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-surface-inverse/65 to-transparent">
        <p className="text-caption text-white/80">{t("photo.hint")}</p>
        <div className="flex items-center gap-2">
          <AriaButton
            onPress={() => zoomFromCentre(view.scale / STEP)}
            isDisabled={!zoomed}
            aria-label={t("photo.zoomOut")}
            className={cn(chrome, "size-11")}
          >
            <Minus aria-hidden className="size-5" />
          </AriaButton>
          <AriaButton
            onPress={() => commit(IDENTITY)}
            isDisabled={!zoomed}
            aria-label={t("photo.fit")}
            className={cn(chrome, "h-11 gap-2 px-4 text-body-sm font-medium")}
          >
            <Maximize aria-hidden className="size-4" />
            {t("photo.fit")}
          </AriaButton>
          <AriaButton
            onPress={() => zoomFromCentre(view.scale * STEP)}
            isDisabled={view.scale >= MAX_SCALE}
            aria-label={t("photo.zoomIn")}
            className={cn(chrome, "size-11")}
          >
            <Plus aria-hidden className="size-5" />
          </AriaButton>
        </div>
      </footer>
    </>
  );
}

export interface PhotoViewerProps {
  src: string;
  alt: string;
  /** The dialog's accessible name, e.g. "Payment slip". */
  title: string;
  /** One line under the title — the amount, or when it was sent. */
  caption?: string;
}

export function PhotoViewer({ src, alt, title, caption }: PhotoViewerProps) {
  return (
    <ModalOverlay
      isDismissable
      className={cn(
        "fixed inset-0 z-[110] bg-[--bg-overlay] backdrop-blur-xl",
        "data-[entering]:anim-fade-in data-[exiting]:anim-fade-out",
      )}
    >
      <Modal className="size-full outline-none">
        <Dialog aria-label={title} className="flex h-dvh w-full flex-col outline-none">
          {({ close }) => (
            <PhotoStage
              src={src}
              alt={alt}
              title={title}
              caption={caption}
              close={close}
            />
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export { DialogTrigger as PhotoViewerTrigger };
