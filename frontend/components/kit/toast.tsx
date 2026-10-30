"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { NOTICE_TILE } from "./tone";

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
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
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
    setToasts((list) => [
      ...list.filter((toast) => toast.message !== message),
      { id, tone, message },
    ].slice(-3));
    setTimeout(
      () => setToasts((list) => list.filter((t) => t.id !== id)),
      5000,
    );
  }, []);

  const api = useMemo(
    () => ({
      show,
      success: (message: string) => show(message, "success"),
      error: (message: string) => show(message, "danger"),
      warning: (message: string) => show(message, "warning"),
      info: (message: string) => show(message, "info"),
    }),
    [show],
  );

  const onChatRoom = usePathname()?.startsWith("/chat/") ?? false;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* A named region, so the label is valid ARIA (an aria-label on a
          role-less div is ignored and flagged by axe, audit P04). Each toast
          is its own status or alert, which is what gets announced. */}
      <div
        role="region"
        aria-label="Notifications"
        className={cn(
          "pointer-events-none fixed inset-x-0 z-[120] flex flex-col items-center gap-2 px-4",
          // A chat room keeps its composer at the bottom of the screen, where
          // a desktop toast would sit on top of it; stay at the top there.
          onChatRoom ? "top-20" : "top-20 md:top-auto md:bottom-6",
        )}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() =>
              setToasts((list) => list.filter((item) => item.id !== toast.id))
            }
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TOAST_ICON = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
  trade: Info,
} satisfies Record<Tone, typeof Info>;

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = TOAST_ICON[toast.tone];
  const urgent = toast.tone === "danger";

  return (
    <div
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      className={cn(
        // A message box that floats: white with a hairline and the tone in
        // the icon tile; a failure is the solid danger strip.
        "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-control border px-3.5 py-3",
        "shadow-floating",
        "anim-rise-in [--ku-rise:0.5rem]",
        urgent
          ? "border-signal-danger-solid bg-signal-danger-solid text-on-signal"
          : "border-line bg-surface text-ink",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-[8px]",
          urgent ? "text-on-signal" : NOTICE_TILE[toast.tone],
        )}
      >
        <Icon className="size-4" />
      </span>
      <p className="min-w-0 flex-1 self-center text-body-sm font-medium break-words">
        {toast.message}
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        pill
        aria-label="Close notification"
        className={cn("-m-2 shrink-0", urgent && "[color:inherit] hover:bg-transparent hover:[color:inherit]")}
        onPress={onClose}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
