"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { isDecodableImage } from "@/lib/image-check";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_BEFORE_CONVERT_BYTES,
  needsConversion,
  prepareImageForUpload,
} from "@/lib/image-prepare";

const ACCEPT = ACCEPTED_IMAGE_TYPES;
/** The upload endpoint's own limit. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Photos attached as evidence (a report or an appeal): thumbnails with a
 * remove button and an add tile, up to `max`. Files stay local until the
 * form submits; the caller uploads them then.
 */
export function EvidencePicker({
  files,
  onChange,
  max = 5,
  label = "Photos",
  hint,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  // Data URLs rather than object URLs: an object URL revoked in an effect
  // cleanup is dead after React's development double-mount.
  useEffect(() => {
    let live = true;
    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
          }),
      ),
    ).then((urls) => {
      if (live) setPreviews(urls);
    });
    return () => {
      live = false;
    };
  }, [files]);

  async function add(picked: File[]) {
    // A GIF or SVG is sent as a PNG, so its size is judged after that; this
    // ceiling only stops a huge file being decoded at all.
    const limitOf = (file: File) =>
      needsConversion(file) ? MAX_BEFORE_CONVERT_BYTES : MAX_BYTES;
    const tooBig = picked.filter((file) => file.size > limitOf(file));
    const sized = picked.filter((file) => file.size <= limitOf(file));
    const room = Math.max(0, max - files.length);
    // Cut to the free slots before decoding: decoding is the expensive step,
    // so it only runs on files that could actually be kept, one at a time.
    const candidates = sized.slice(0, room);
    // The type is read from the file name; decoding is what proves a photo
    // (audit B04), so a renamed text file is turned away here, not by the API.
    const ok: File[] = [];
    let oversized = 0;
    for (const file of candidates) {
      if (!(await isDecodableImage(file))) continue;
      try {
        const ready = await prepareImageForUpload(file);
        if (ready.size > MAX_BYTES) oversized += 1;
        else ok.push(ready);
      } catch {
        // Unreadable once drawn: counted below as not a photo.
      }
    }
    const notImages = candidates.length - ok.length - oversized;
    setError(
      notImages
        ? notImages === 1
          ? "1 file was not a photo and was left out."
          : `${notImages} files were not photos and were left out.`
        : tooBig.length + oversized
          ? "Each photo must be 5MB or smaller."
          : sized.length > room
            ? `Up to ${max} photos.`
            : null,
    );
    if (ok.length) onChange([...files, ...ok]);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm font-medium text-ink-secondary">
        {label}{" "}
        <span className="font-normal text-ink-muted">
          ({files.length}/{max})
        </span>
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {files.map((file, index) => (
          <li
            key={`${file.name}-${file.lastModified}-${index}`}
            className="relative aspect-square overflow-hidden rounded-control bg-surface-sunken"
          >
            {previews[index] ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview
              <img
                src={previews[index]}
                alt={`Evidence photo ${index + 1}`}
                className="size-full object-cover"
              />
            ) : null}
            <button
              type="button"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => onChange(files.filter((_, i) => i !== index))}
              className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-surface-inverse/75 text-white hover:bg-surface-inverse"
            >
              <X aria-hidden className="size-4" />
            </button>
          </li>
        ))}
        {files.length < max ? (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-control border-2 border-dashed border-line-default text-meta text-ink-muted transition-colors hover:border-brand hover:text-ink-brand"
            >
              <ImagePlus aria-hidden className="size-5" />
              Add photo
            </button>
          </li>
        ) : null}
      </ul>
      {hint ? <p className="text-caption text-ink-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-caption text-tone-danger-fg">
          {error}
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        aria-label="Add photo"
        onChange={(event) => {
          // Copied first: clearing the input empties its live FileList.
          const list = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = "";
          void add(list);
        }}
      />
    </div>
  );
}
