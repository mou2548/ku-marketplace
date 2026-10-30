"use client";

import NextLink from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

/**
 * Quiet badges, Style 3 (docs/redesign/quiet-badges/plan.md, owner decision
 * 2026-10-30).
 *
 * - Primary: a primary-700 fill (`--action-primary`, white label 5.87:1; the
 *   dark theme flips to a light green with dark text), 15px/600, never wraps.
 *   One per screen. This replaces decision D2's brand fill with a 19px/700
 *   label, which only passed as large text and had to be allowed to wrap.
 * - Secondary: white surface, a 1px `--action-secondary-border` edge, ink.
 * - Danger: the calm danger solid, for the confirming step of a destructive
 *   action.
 * - Ghost and subtle are unchanged. There is no trade variant: trade has no
 *   colour, so a trade action is a primary or a secondary like any other.
 *
 * Flat: no raised shadow. The press still translates 1px.
 */
const button = cva(
  [
    "relative inline-flex items-center justify-center gap-2",
    // The 44px floor on phones. See globals.css, TOUCH TARGETS.
    "touch-target",
    "font-semibold whitespace-nowrap select-none",
    "transition-[transform,background-color,filter] duration-[--dur-fast] ease-[--ease-out]",
    "disabled:pointer-events-none disabled:opacity-45",
    "data-[pressed]:translate-y-px",
  ],
  {
    variants: {
      variant: {
        primary:
          "border border-transparent bg-action-primary text-on-action-primary hover:brightness-95 data-[pressed]:brightness-90",
        secondary:
          "border border-action-secondary-border bg-surface text-ink hover:bg-surface-sunken data-[pressed]:bg-surface-sunken",
        subtle:
          "bg-brand-subtle [color:var(--text-brand)] hover:bg-[var(--brand-subtle-hover)] data-[pressed]:bg-[var(--brand-subtle-hover)]",
        ghost:
          "[color:var(--text-secondary)] hover:bg-gray-100 hover:[color:var(--text-primary)] data-[pressed]:bg-gray-200",
        danger:
          "border border-transparent bg-signal-danger-solid text-on-signal hover:brightness-95 data-[pressed]:brightness-90",
      },
      size: {
        sm: "h-9 rounded-control px-3 text-body-sm",
        md: "h-11 rounded-control px-4 text-[0.9375rem] leading-[1.4]",
        lg: "h-13 rounded-control px-6 text-[0.9375rem] leading-[1.4]",
        icon: "size-11 rounded-control",
        "icon-sm": "size-9 rounded-control",
      },
      /** Full-width primary action — the mobile default at the bottom of a form. */
      block: { true: "w-full", false: "" },
      pill: { true: "rounded-pill", false: "" },
    },
    // Ghost and subtle keep their origin/main type: 500 weight, 16px at md
    // and 17px at lg.
    compoundVariants: [
      { variant: ["ghost", "subtle"], className: "font-medium" },
      { variant: ["ghost", "subtle"], size: "md", className: "text-body" },
      { variant: ["ghost", "subtle"], size: "lg", className: "text-body-lg" },
    ],
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends Omit<AriaButtonProps, "className" | "children">,
    VariantProps<typeof button> {
  className?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
  /** Announced while `isLoading`. Defaults to the Thai for "processing". */
  loadingLabel?: string;
}

export function Button({
  className,
  variant,
  size,
  block,
  pill,
  isLoading = false,
  loadingLabel = "Working",
  isDisabled,
  children,
  /**
   * Forwarded to the underlying button. Needed wherever focus has to be put
   * back somewhere deliberate — an inline edit returning focus to the control
   * that opened it, for one (CLAUDE.md §6).
   */
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <AriaButton
      {...props}
      ref={ref}
      isDisabled={isDisabled || isLoading}
      className={cn(button({ variant, size, block, pill }), className)}
    >
      {isLoading ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          <span className="sr-only">{loadingLabel}</span>
          <span aria-hidden>{children}</span>
        </>
      ) : (
        children
      )}
    </AriaButton>
  );
}

/**
 * A navigation that looks like a button. Deliberately a real `next/link` and
 * not a Button with an onPress that pushes: middle-click, cmd-click, and
 * prefetch all break when a link is faked with a button.
 */
export interface LinkButtonProps
  extends Omit<React.ComponentProps<typeof NextLink>, "className">,
    VariantProps<typeof button> {
  className?: string;
}

export function LinkButton({
  className,
  variant,
  size,
  block,
  pill,
  ...props
}: LinkButtonProps) {
  return (
    <NextLink
      {...props}
      className={cn(button({ variant, size, block, pill }), className)}
    />
  );
}

export { button as buttonStyles };
