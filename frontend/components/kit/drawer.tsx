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
 * An edge-anchored panel: full height, slides in from the left, dismissable by
 * backdrop, Escape, or the close button.
 *
 * Separate from `Overlay` because the two solve different problems. `Overlay`
 * is a bottom sheet that grows to its content — a decision to make. A drawer is
 * a fixed-height surface holding navigation; sharing one component would mean
 * one of the two ends up with the wrong sizing rules.
 *
 * Focus trapping, scroll locking, `aria-modal`, and restore-focus-on-close all
 * come from react-aria-components (CLAUDE.md §6).
 */
export interface DrawerProps extends Omit<ModalOverlayProps, "children"> {
  title: string;
  children: React.ReactNode;
  side?: "left" | "right";
  className?: string;
}

export function Drawer({
  title,
  children,
  side = "left",
  className,
  ...props
}: DrawerProps) {
  return (
    <ModalOverlay
      {...props}
      isDismissable
      className={cn(
        "fixed inset-0 z-[100] bg-[--bg-overlay] backdrop-blur-[2px]",
        "flex",
        side === "right" && "justify-end",
        "data-[entering]:anim-fade-in",
        "data-[exiting]:anim-fade-out",
      )}
    >
      <Modal
        className={cn(
          "h-full w-[min(20rem,85vw)] bg-surface shadow-overlay outline-none",
          side === "left"
            ? "rounded-r-panel data-[entering]:anim-slide-in-left data-[exiting]:anim-slide-out-left"
            : "rounded-l-panel data-[entering]:anim-slide-in-right data-[exiting]:anim-slide-out-right",
          className,
        )}
      >
        <Dialog className="flex h-full flex-col outline-none">
          {({ close }) => (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <Heading
                  slot="title"
                  className="text-[1.0625rem] leading-[1.3] font-bold tracking-[-0.012em] text-ink-brand"
                >
                  {title}
                </Heading>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  pill
                  onPress={close}
                  aria-label="Close menu"
                >
                  <X className="size-4" />
                </Button>
              </header>

              <div className="flex-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {children}
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export { DialogTrigger as DrawerTrigger };
