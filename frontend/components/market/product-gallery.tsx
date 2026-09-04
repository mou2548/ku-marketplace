"use client";

import { useMemo, useState } from "react";
import { Button as AriaButton } from "react-aria-components";

import { PostImage } from "@/components/kit/post-image";
import { cn } from "@/lib/utils";

interface GalleryImage {
  image_id: number;
  image_url: string;
  display_order: number;
  is_primary?: boolean;
}

/** A compact commerce gallery with an accessible thumbnail selector. */
export function ProductGallery({
  images,
  name,
}: {
  images: GalleryImage[];
  name: string;
}) {
  const ordered = useMemo(
    () => [...images].sort((a, b) => a.display_order - b.display_order),
    [images],
  );
  const [selectedId, setSelectedId] = useState<number | null>(
    ordered.find((image) => image.is_primary)?.image_id ??
      ordered[0]?.image_id ??
      null,
  );
  const selected =
    ordered.find((image) => image.image_id === selectedId) ?? ordered[0];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-panel bg-surface-sunken shadow-raised">
        <PostImage
          src={selected?.image_url}
          alt={name}
          aspectRatio={1}
          priority
          sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 52vw, 40vw"
          className="h-full"
        />
      </div>

      {ordered.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product photos">
          {ordered.map((image, index) => {
            const isSelected = image.image_id === selectedId;
            return (
              <AriaButton
                key={image.image_id}
                aria-label={`View photo ${index + 1} of ${ordered.length}`}
                aria-pressed={isSelected}
                onPress={() => setSelectedId(image.image_id)}
                className={cn(
                  "relative aspect-square w-16 shrink-0 overflow-hidden rounded-control bg-surface-sunken",
                  "outline-none ring-2 ring-transparent ring-offset-2 ring-offset-[var(--bg-page)]",
                  "focus-visible:ring-brand",
                  isSelected ? "ring-brand" : "opacity-70 hover:opacity-100",
                )}
              >
                <PostImage
                  src={image.image_url}
                  alt=""
                  aspectRatio={1}
                  sizes="64px"
                  className="h-full"
                />
              </AriaButton>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
