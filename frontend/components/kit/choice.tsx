"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  Checkbox as AriaCheckbox,
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  Select as AriaSelect,
  Switch as AriaSwitch,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  SelectValue,
  type CheckboxProps,
  type RadioGroupProps,
  type RadioProps,
  type SelectProps,
  type SwitchProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

import { FieldError, FieldHint, Label } from "./field";

/**
 * Choice controls. All four keep a 44px touch target on coarse pointers even
 * when the visible mark is smaller — CLAUDE.md §5.
 */

/* ---------------------------------------------------------------- Select */

export interface SelectFieldProps<T extends object>
  extends Omit<SelectProps<T>, "children"> {
  label?: string;
  hint?: string;
  errorMessage?: string;
  placeholder?: string;
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
  className?: string;
  /** `sm` is a compact trigger for dense toolbars (the chat inbox sort). */
  size?: "sm" | "md";
}

export function SelectField<T extends object>({
  label,
  hint,
  errorMessage,
  placeholder = "Select",
  items,
  children,
  className,
  size = "md",
  ...props
}: SelectFieldProps<T>) {
  return (
    <AriaSelect
      {...props}
      placeholder={placeholder}
      className={cn("flex flex-col gap-1.5", className)}
    >
      {label ? <Label>{label}</Label> : null}
      <Button
        className={cn(
          "flex w-full items-center justify-between gap-2",
          "rounded-control bg-surface-sunken shadow-sunken",
          "text-left text-ink",
          "data-[disabled]:opacity-50",
          size === "sm" ? "h-9 px-3 text-caption" : "h-12 px-3.5 text-body",
        )}
      >
        <SelectValue className="truncate data-[placeholder]:text-ink-disabled" />
        <ChevronDown
          aria-hidden
          className={cn("shrink-0 text-ink-muted", size === "sm" ? "size-3.5" : "size-4")}
        />
      </Button>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <FieldError>{errorMessage}</FieldError>

      <Popover
        className={cn(
          "z-[90] w-[--trigger-width] overflow-auto rounded-control bg-surface p-1 shadow-overlay",
          "max-h-64",
          "data-[entering]:anim-pop-in",
          "data-[exiting]:anim-fade-out",
        )}
      >
        <ListBox items={items} className="outline-none">
          {children}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

export function SelectOption({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ListBoxItem>) {
  return (
    <ListBoxItem
      {...props}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 rounded-chip px-3 py-2.5",
        "text-body outline-none",
        "data-[focused]:bg-brand-subtle data-[focused]:text-ink-brand",
        "data-[selected]:font-semibold",
        className,
      )}
    >
      {(renderProps) => (
        <>
          {typeof children === "function" ? children(renderProps) : children}
          {renderProps.isSelected ? (
            <Check aria-hidden className="size-4 shrink-0 text-brand" />
          ) : null}
        </>
      )}
    </ListBoxItem>
  );
}

/* -------------------------------------------------------------- Checkbox */

export function Checkbox({
  className,
  children,
  ...props
}: CheckboxProps & { children?: React.ReactNode }) {
  return (
    <AriaCheckbox
      {...props}
      className={cn(
        "group flex min-h-11 min-w-11 cursor-pointer items-center gap-2.5 text-body",
        className,
      )}
    >
      {({ isSelected, isIndeterminate }) => (
        <>
          <span
            className={cn(
              "grid size-5 shrink-0 place-items-center rounded-[0.375rem]",
              "transition-colors duration-[--dur-fast]",
              isSelected || isIndeterminate
                ? "bg-brand text-on-brand shadow-raised"
                : "bg-surface-sunken shadow-sunken",
            )}
          >
            {isSelected || isIndeterminate ? (
              <Check aria-hidden className="size-3.5" strokeWidth={3} />
            ) : null}
          </span>
          {children}
        </>
      )}
    </AriaCheckbox>
  );
}

/* ------------------------------------------------------------ RadioGroup */

export interface RadioGroupFieldProps extends Omit<RadioGroupProps, "children"> {
  label?: string;
  hint?: string;
  errorMessage?: string;
  children: React.ReactNode;
  /** Cards read better than dots when each option needs an explanation. */
  variant?: "dot" | "card";
  className?: string;
}

export function RadioGroupField({
  label,
  hint,
  errorMessage,
  children,
  variant = "dot",
  className,
  ...props
}: RadioGroupFieldProps) {
  return (
    <AriaRadioGroup
      {...props}
      data-variant={variant}
      className={cn("flex flex-col gap-2", className)}
    >
      {label ? <Label>{label}</Label> : null}
      <div className={cn("flex flex-col gap-2", variant === "dot" && "gap-1")}>
        {children}
      </div>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <FieldError>{errorMessage}</FieldError>
    </AriaRadioGroup>
  );
}

export function Radio({
  className,
  children,
  description,
  ...props
}: RadioProps & { children?: React.ReactNode; description?: string }) {
  return (
    <AriaRadio
      {...props}
      className={cn(
        "group flex min-h-11 min-w-11 cursor-pointer items-start gap-2.5 text-body",
        // With a description the whole row becomes a pressable card — the shape
        // the giveaway allocation picker needs, where each option must explain
        // itself (research R7).
        description &&
          "rounded-control bg-surface p-3.5 shadow-raised data-[selected]:ring-2 data-[selected]:ring-brand",
        className,
      )}
    >
      {({ isSelected }) => (
        <>
          <span
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-pill",
              "transition-colors duration-[--dur-fast]",
              isSelected ? "bg-brand shadow-raised" : "bg-surface-sunken shadow-sunken",
            )}
          >
            {isSelected ? (
              <span aria-hidden className="size-2 rounded-pill bg-white" />
            ) : null}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className={cn(isSelected && "font-medium")}>{children}</span>
            {description ? (
              <span className="text-caption leading-[1.5] text-ink-muted">
                {description}
              </span>
            ) : null}
          </span>
        </>
      )}
    </AriaRadio>
  );
}

/* ---------------------------------------------------------------- Switch */

export function Switch({
  className,
  children,
  ...props
}: SwitchProps & { children?: React.ReactNode }) {
  return (
    <AriaSwitch
      {...props}
      className={cn(
        "group flex min-h-11 cursor-pointer items-center justify-between gap-3 text-body",
        className,
      )}
    >
      {({ isSelected }) => (
        <>
          {children}
          <span
            className={cn(
              "flex h-6 w-11 shrink-0 items-center rounded-pill p-0.5",
              "transition-colors duration-[--dur-fast] ease-[--ease-out]",
              isSelected ? "bg-brand" : "bg-gray-300",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-5 rounded-pill bg-white shadow-raised",
                "transition-transform duration-[--dur-fast] ease-[--ease-spring]",
                isSelected && "translate-x-5",
              )}
            />
          </span>
        </>
      )}
    </AriaSwitch>
  );
}
