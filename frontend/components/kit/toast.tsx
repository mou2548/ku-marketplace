"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";

import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { TONE_CHIP } from "./tone";

/**
 * Confirmations for actions that do not change the screen — a slip uploaded, a
 * tracking number saved, an offer withdrawn. Anything that *does* change the
 * screen should say so by changing, not by toasting.
 *
 * `role="status"` with `aria-live="polite"` so a screen reader hears it without
 * losing its place. Toasts sit above the bottom tab bar on mobile.
 */

export interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, tone, message }]);
    setTimeout(
      () => setToasts((list) => list.filter((t) => t.id !== id)),
      5000,
    );
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 z-[120] flex flex-col items-center gap-2 px-4",
          "bottom-[max(0.75rem,env(safe-area-inset-bottom))] lg:bottom-6",
        )}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-card border px-4 py-3",
              "shadow-floating",
              "anim-rise-in [--ku-rise:0.5rem]",
              TONE_CHIP[t.tone],
            )}
          >
            <p className="flex-1 text-[0.875rem] leading-[1.65] font-medium">
              {t.message}
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              pill
              aria-label="Close"
              onPress={() =>
                setToasts((list) => list.filter((x) => x.id !== t.id))
              }
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
