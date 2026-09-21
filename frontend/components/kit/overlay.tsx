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
  /** Locks every dismissal path while an async decision is being saved. */
  isBusy?: boolean;
  /** Lets media and scanner overlays remove the standard body inset. */
  bodyClassName?: string;
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
  isBusy = false,
  isDismissable = true,
  isKeyboardDismissDisabled,
  bodyClassName,
  className,
  ...props
}: OverlayProps) {
  const asSheet = variant !== "dialog";
  const asDialog = variant !== "sheet";

  return (
    <ModalOverlay
      {...props}
      isDismissable={isDismissable && !isBusy}
      isKeyboardDismissDisabled={isBusy || isKeyboardDismissDisabled}
      className={cn(
        "fixed inset-0 z-[100] bg-[--bg-overlay] backdrop-blur-[2px]",
        "flex justify-center",
        variant === "responsive" && "items-end sm:items-center sm:p-4",
        variant === "dialog" && "items-center p-4",
        variant === "sheet" && "items-end",
        "data-[entering]:anim-fade-in",
        "data-[exiting]:anim-fade-out",
      )}
    >
      <Modal
        className={cn(
          "w-full bg-surface shadow-overlay outline-none",
          asSheet && "max-h-[92dvh] rounded-t-panel",
          asDialog && "sm:max-h-[85dvh] sm:rounded-panel",
          variant === "dialog" && "max-h-[85dvh] rounded-panel",
          SIZE[size],
          "data-[entering]:anim-rise-in sm:data-[entering]:anim-pop-in",
          className,
        )}
      >
        <Dialog className="flex max-h-[inherit] flex-col outline-none">
          {({ close }) => (
            <>
              {asSheet ? (
                <span
                  aria-hidden
                  className="mx-auto mt-2 block h-1 w-10 shrink-0 rounded-pill bg-line-default sm:hidden"
                />
              ) : null}

              <header className="flex shrink-0 items-start justify-between gap-3 p-5 pb-3">
                <div className="flex flex-col gap-1">
                  <Heading
                    slot="title"
                    className="text-[1.25rem] leading-[1.3] font-semibold tracking-[-0.012em]"
                  >
                    {title}
                  </Heading>
                  {description ? (
                    <p className="text-body-sm text-ink-muted">
                      {description}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  pill
                  onPress={close}
                  isDisabled={isBusy}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </header>

              <div
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2",
                  bodyClassName,
                )}
              >
                {children}
              </div>

              {footer ? (
                <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-line p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-5">
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
