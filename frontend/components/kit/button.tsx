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
 * Depth over outline (design principle 9): every solid button carries a lit top
 * edge via --shadow-raised, and presses by translating 1px rather than only
 * changing colour.
 *
 * `bg-brand text-on-brand` is 4.04:1 — allowed here and only here, because
 * button labels are >=15px at weight 600, which WCAG counts as large text.
 * Never use --brand for body copy. See docs/design/tokens.md §2.
 */
const button = cva(
  [
    "relative inline-flex items-center justify-center gap-2",
    "font-medium whitespace-nowrap select-none",
    "transition-[transform,background-color,box-shadow] duration-[--dur-fast] ease-[--ease-out]",
    "disabled:pointer-events-none disabled:opacity-45",
    "data-[pressed]:translate-y-px",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-on-brand shadow-raised hover:bg-brand-hover data-[pressed]:bg-brand-active",
        // No border: `shadow-raised` already ends in a hairline ring, and
        // stacking one on top made a secondary button pixel-identical to a
        // Surface card — which is what made a wide one stop reading as a
        // button at all. Same reason surface.tsx dropped its border.
        secondary:
          "bg-surface text-ink shadow-raised hover:bg-gray-50 data-[pressed]:bg-gray-100",
        subtle:
          "bg-brand-subtle text-ink-brand hover:bg-green-200 data-[pressed]:bg-green-300",
        ghost:
          "text-ink-secondary hover:bg-gray-100 hover:text-ink data-[pressed]:bg-gray-200",
        danger:
          "bg-tone-danger-solid text-white shadow-raised hover:brightness-95 data-[pressed]:brightness-90",
      },
      size: {
        sm: "h-9 rounded-control px-3 text-[0.875rem]",
        md: "h-11 rounded-control px-4 text-[0.9375rem]",
        lg: "h-13 rounded-control px-6 text-[1.0625rem]",
        icon: "size-11 rounded-control",
        "icon-sm": "size-9 rounded-control",
      },
      /** Full-width primary action — the mobile default at the bottom of a form. */
      block: { true: "w-full", false: "" },
      pill: { true: "rounded-pill", false: "" },
    },
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
      // Touch targets stay >=44px on coarse pointers even at size="sm".
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
