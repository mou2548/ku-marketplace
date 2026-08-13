"use client";

import { X } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  type ModalOverlayProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

import { Button } from "./button";

/**
 * One overlay primitive, two presentations. Design principle 8: mobile is the
 * design — a centred dialog at 360px wastes the thumb zone, so the same
 * content renders as a bottom sheet below `sm` and as a dialog above it.
 *
 * react-aria-components handles focus trapping, scroll locking, `aria-modal`,
 * and Escape. Do not hand-roll any of that (CLAUDE.md §6).
 */

export interface OverlayProps extends Omit<ModalOverlayProps, "children"> {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Buttons pinned to the bottom. On mobile they stack full-width. */
  footer?: React.ReactNode;
  /** Force one presentation instead of switching at the breakpoint. */
  variant?: "responsive" | "dialog" | "sheet";
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

export function Overlay({
  title,
  description,
  children,
  footer,
  variant = "responsive",
  size = "md",
  className,
  ...props
}: OverlayProps) {
  const asSheet = variant !== "dialog";
  const asDialog = variant !== "sheet";

  return (
    <ModalOverlay
      {...props}
      isDismissable
      className={cn(
        "fixed inset-0 z-[100] bg-[--bg-overlay] backdrop-blur-[2px]",
        "flex items-end justify-center sm:items-center",
        "data-[entering]:animate-in data-[entering]:fade-in",
        "data-[exiting]:animate-out data-[exiting]:fade-out",
      )}
    >
      <Modal
        className={cn(
          "w-full bg-surface shadow-overlay outline-none",
          asSheet && "max-h-[92dvh] rounded-t-panel",
          asDialog && "sm:max-h-[85dvh] sm:rounded-panel",
          !asSheet && "rounded-panel",
          SIZE[size],
          "data-[entering]:animate-in data-[entering]:slide-in-from-bottom-4 sm:data-[entering]:zoom-in-95 sm:data-[entering]:slide-in-from-bottom-0",
          className,
        )}
      >
        <Dialog className="flex max-h-[inherit] flex-col outline-none">
          {({ close }) => (
            <>
              <header className="flex items-start justify-between gap-3 p-5 pb-3">
                <div className="flex flex-col gap-1">
                  <Heading
                    slot="title"
                    className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.012em]"
                  >
                    {title}
                  </Heading>
                  {description ? (
                    <p className="text-[0.875rem] leading-[1.65] text-ink-muted">
                      {description}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  pill
                  onPress={close}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </header>

              <div className="flex-1 overflow-y-auto px-5 pb-2">{children}</div>

              {footer ? (
                <footer className="flex flex-col-reverse gap-2 border-t border-line p-5 pt-3 sm:flex-row sm:justify-end">
                  {footer}
                </footer>
              ) : (
                // Bottom sheets sit above the home indicator on iOS.
                <div className="pb-[max(1.25rem,env(safe-area-inset-bottom))]" />
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export { DialogTrigger as OverlayTrigger };
