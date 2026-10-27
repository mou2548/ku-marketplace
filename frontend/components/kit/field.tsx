"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  FieldError as AriaFieldError,
  Input as AriaInput,
  Label as AriaLabel,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  Text,
  type TextFieldProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

/**
 * Inputs are sunken, not outlined — the inverse of a button. That contrast is
 * what makes a form read as a set of wells you fill rather than a stack of
 * grey rectangles (design principle 9).
 */
const controlBase = [
  "w-full bg-surface-sunken text-ink placeholder:text-ink-disabled",
  "rounded-control shadow-sunken",
  "transition-shadow duration-[--dur-fast] ease-[--ease-out]",
  "disabled:opacity-50",
];

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof AriaLabel>) {
  return (
    <AriaLabel
      {...props}
      className={cn(
        "text-body-sm font-medium text-ink-secondary",
        className,
      )}
    />
  );
}

export function FieldError({
  className,
  ...props
}: React.ComponentProps<typeof AriaFieldError>) {
  return (
    <AriaFieldError
      {...props}
      className={cn(
        "text-caption leading-[1.5] font-medium text-tone-danger-fg",
        className,
      )}
    />
  );
}

export function FieldHint({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      {...props}
      slot="description"
      className={cn("text-caption leading-[1.5] text-ink-muted", className)}
    />
  );
}

export interface TextInputProps extends Omit<TextFieldProps, "children"> {
  label?: string;
  hint?: string;
  errorMessage?: string;
  placeholder?: string;
  /** Rendered inside the well, before the text. */
  icon?: React.ReactNode;
  /** Rendered inside the well, after the text. */
  suffix?: React.ReactNode;
  className?: string;
  inputClassName?: string;
}

export function TextInput({
  label,
  hint,
  errorMessage,
  placeholder,
  icon,
  suffix,
  className,
  inputClassName,
  type,
  ...props
}: TextInputProps) {
  const isPassword = type === "password";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const resolvedType = isPassword && passwordVisible ? "text" : type;

  return (
    <AriaTextField
      {...props}
      type={resolvedType}
      className={cn("flex flex-col gap-1.5", className)}
    >
      {label ? <Label>{label}</Label> : null}
      <div className="relative">
        {icon ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
          >
            {icon}
          </span>
        ) : null}
        <AriaInput
          placeholder={placeholder}
          className={cn(
            controlBase,
            "h-12 px-3.5 text-body",
            icon && "pl-11",
            (suffix || isPassword) && "pr-12",
            inputClassName,
          )}
        />
        {suffix ? (
          <span
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-ink-muted",
              isPassword ? "right-12" : "right-3.5",
            )}
          >
            {suffix}
          </span>
        ) : null}
        {isPassword ? (
          <button
            type="button"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-pill text-ink-muted transition-colors hover:bg-brand-subtle hover:text-ink-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
          >
            {passwordVisible ? (
              <EyeOff aria-hidden className="size-4.5" />
            ) : (
              <Eye aria-hidden className="size-4.5" />
            )}
          </button>
        ) : null}
      </div>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}

export interface TextAreaFieldProps extends Omit<TextFieldProps, "children"> {
  label?: string;
  hint?: string;
  errorMessage?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function TextAreaField({
  label,
  hint,
  errorMessage,
  placeholder,
  rows = 4,
  className,
  ...props
}: TextAreaFieldProps) {
  return (
    <AriaTextField {...props} className={cn("flex flex-col gap-1.5", className)}>
      {label ? <Label>{label}</Label> : null}
      <AriaTextArea
        rows={rows}
        placeholder={placeholder}
        className={cn(controlBase, "resize-y px-3.5 py-3 text-body")}
      />
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}

export { controlBase };
