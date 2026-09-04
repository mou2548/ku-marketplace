"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Package } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The image well of a card, with a real failure state.
 *
 * A design review on the built product found cards rendering as tall empty
 * white boxes. The cause was not a missing photo — it was a photo that failed
 * to load, at which point `next/image` falls back to showing alt text on a
 * blank box, which reads as a broken page rather than a design.
 *
 * So there are three states here and none is a hole:
 *   - loading: a quiet image-shaped ghost, without status copy that flashes
 *   - no photo at all: a short branded plate, so the card just gets shorter
 *   - photo that failed: the same plate plus an icon saying so
 *
 * Client-side because `onError` needs to run in the browser.
 */
export function PostImage({
  src,
  alt,
  aspectRatio = 0.8,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw",
  priority = false,
  className,
}: {
  src?: string | null;
  alt: string;
  aspectRatio?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const failed = !!src && failedSrc === src;
  const loaded = !!src && loadedSrc === src;
  const showPlate = !src || failed;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        "bg-surface-sunken",
        className,
      )}
      // A plate is short on purpose: an empty tall box is the thing we are
      // fixing. A card with no usable photo should shrink, not leave a gap.
      style={{ aspectRatio: showPlate ? "16 / 7" : String(aspectRatio) }}
    >
      {showPlate ? (
        <span className="absolute inset-0 flex items-center justify-center gap-2 text-ink-muted">
          {failed ? (
            <ImageOff aria-hidden className="size-5 text-ink-brand opacity-75" />
          ) : (
            <Package aria-hidden className="size-5 text-ink-brand opacity-75" />
          )}
          <span className="text-meta font-medium opacity-80">
            {failed ? "Photo unavailable" : "No photo"}
          </span>
        </span>
      ) : (
        <>
          {!loaded ? (
            <span
              aria-hidden
              className="absolute inset-0 animate-pulse overflow-hidden bg-surface-sunken"
            >
              <span className="absolute inset-x-[12%] bottom-[12%] h-[24%] rounded-control bg-line-subtle/70" />
              <span className="absolute right-[16%] top-[16%] size-[14%] rounded-pill bg-line-default/70" />
              <span className="absolute -bottom-[8%] -left-[8%] size-[58%] rotate-45 rounded-control bg-line-default/45" />
              <span className="absolute -bottom-[18%] right-[2%] size-[54%] rotate-45 rounded-control bg-line-subtle/80" />
            </span>
          ) : null}
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            className={cn(
              "object-cover transition-opacity duration-[--dur-fast]",
              loaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setLoadedSrc(src)}
            onError={() => setFailedSrc(src)}
          />
        </>
      )}
    </div>
  );
}
