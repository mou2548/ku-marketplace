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
 * So there are two states here and neither is a hole:
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
  const [failed, setFailed] = useState(false);
  const showPlate = !src || failed;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        showPlate ? "bg-brand-subtle" : "bg-surface-sunken",
        className,
      )}
      // A plate is short on purpose: an empty tall box is the thing we are
      // fixing. A card with no usable photo should shrink, not leave a gap.
      style={{ aspectRatio: showPlate ? "16 / 7" : String(aspectRatio) }}
    >
      {showPlate ? (
        <span className="texture-grid absolute inset-0 flex items-center justify-center gap-2 text-ink-brand">
          {failed ? (
            <ImageOff aria-hidden className="size-5 opacity-70" />
          ) : (
            <Package aria-hidden className="size-5 opacity-70" />
          )}
          <span className="text-[0.75rem] font-medium opacity-80">
            {failed ? "Photo unavailable" : "No photo"}
          </span>
        </span>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
