"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * The OTP entry for registration (flow 4: a 10-minute code).
 *
 * Hand-written rather than pulled from a library because the behaviour that
 * actually matters is small and specific: one real input holds the value so
 * autofill and `autocomplete="one-time-code"` work on iOS and Android, and the
 * boxes are presentation over it. Splitting the value across six inputs — the
 * common approach — breaks SMS autofill on both platforms.
 */
export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label?: string;
  errorMessage?: string;
  autoFocus?: boolean;
  className?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  label = "One-time code",
  errorMessage,
  autoFocus,
  className,
}: OtpInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const cells = Array.from({ length });
  const focusIndex = Math.min(value.length, length - 1);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="relative block">
        <span className="sr-only">{label}</span>

        <input
          ref={ref}
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, "").slice(0, length))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          aria-label={label}
          aria-invalid={!!errorMessage}
          // Transparent and stretched over the boxes: the caret is invisible,
          // the tap target is the whole row, and the value stays in one field.
          className="absolute inset-0 z-10 w-full opacity-0"
        />

        <span aria-hidden className="flex justify-between gap-2">
          {cells.map((_, i) => (
            <span
              key={i}
              className={cn(
                "grid h-14 flex-1 place-items-center rounded-control",
                "bg-surface-sunken shadow-sunken",
                "text-[1.25rem] font-semibold tabular-nums",
                "transition-shadow duration-[--dur-fast]",
                i === focusIndex &&
                  value.length < length &&
                  "shadow-[var(--shadow-sunken),0_0_0_2px_var(--brand)]",
                errorMessage &&
                  "shadow-[var(--shadow-sunken),0_0_0_2px_var(--tone-danger-solid)]",
              )}
            >
              {value[i] ?? ""}
            </span>
          ))}
        </span>
      </label>

      {errorMessage ? (
        <p role="alert" className="text-caption font-medium text-tone-danger-fg">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
