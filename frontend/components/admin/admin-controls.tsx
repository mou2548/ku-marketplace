"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Button as AriaButton,
  FieldError,
  Label,
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  Text,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

/**
 * Interactive pieces of the admin workspace, in the same hairline language as
 * `admin-ui.tsx`: bordered, flat, green only on the one primary action.
 * Built on `react-aria-components` like the rest of the kit; the student kit's
 * raised buttons and sunken fields are not used in admin.
 */

const BUTTON_TONE = {
  // White on the brand fill passes only as large text, so the primary label
  // is 19px bold like the student kit's (decision D2, audit P05).
  primary:
    "border-brand bg-brand text-action font-bold text-balance text-center [color:var(--on-brand)] hover:bg-brand-hover data-[pressed]:bg-brand-active",
  secondary:
    "border-line-default bg-surface text-ink hover:bg-surface-sunken data-[pressed]:bg-surface-sunken",
  plain:
    "border-transparent bg-transparent text-ink-secondary hover:bg-surface-sunken hover:text-ink",
} as const;

export function AdminButton({
  tone = "secondary",
  isLoading,
  isDisabled,
  className,
  children,
  ...props
}: Omit<AriaButtonProps, "children" | "className"> & {
  tone?: keyof typeof BUTTON_TONE;
  isLoading?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AriaButton
      {...props}
      isDisabled={isDisabled || isLoading}
      className={cn(
        "touch-target inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[10px] border px-3.5 text-body-sm transition-colors",
        "outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:size-4",
        BUTTON_TONE[tone],
        className,
      )}
    >
      {isLoading ? <Loader2 aria-hidden className="animate-spin" /> : null}
      {children}
    </AriaButton>
  );
}

/** Options as rows in one bordered list: the admin compares them side by
 * side, so they are not separate cards. */
export function AdminRadioGroup({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <AriaRadioGroup
      value={value}
      onChange={onChange}
      className="flex flex-col gap-1.5"
    >
      <Label className="text-body-sm font-medium text-ink-secondary">
        {label}
      </Label>
      <div className="overflow-hidden rounded-[10px] border border-line">
        {children}
      </div>
    </AriaRadioGroup>
  );
}

export function AdminRadio({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: string;
}) {
  return (
    <AriaRadio
      value={value}
      className={cn(
        "group flex cursor-pointer items-start gap-3 border-b border-line px-3.5 py-3 last:border-b-0",
        "outline-none data-[focus-visible]:bg-surface-sunken data-[hovered]:bg-surface-sunken/60 data-[selected]:bg-surface-sunken",
      )}
    >
      {({ isSelected }) => (
        <>
          <span
            aria-hidden
            className={cn(
              "mt-1 grid size-4 shrink-0 place-items-center rounded-full border",
              isSelected ? "border-brand bg-brand" : "border-line-default bg-surface",
            )}
          >
            {isSelected ? (
              <span className="size-1.5 rounded-full bg-white" />
            ) : null}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className={cn("text-body-sm text-ink", isSelected && "font-medium")}>
              {label}
            </span>
            <span className="text-meta leading-[1.5] text-ink-muted">
              {description}
            </span>
          </span>
        </>
      )}
    </AriaRadio>
  );
}

export function AdminTextArea({
  label,
  hint,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <AriaTextField
      value={value}
      onChange={onChange}
      className="flex flex-col gap-1.5"
    >
      <Label className="text-body-sm font-medium text-ink-secondary">
        {label}
      </Label>
      <AriaTextArea
        rows={rows}
        placeholder={placeholder}
        className={cn(
          "w-full resize-y rounded-[10px] border border-line-default bg-surface px-3.5 py-2.5 text-body-sm text-ink placeholder:text-ink-disabled",
          "outline-none data-[focused]:border-brand",
        )}
      />
      {hint ? (
        <Text slot="description" className="text-meta text-ink-muted">
          {hint}
        </Text>
      ) : null}
      <FieldError className="text-meta text-tone-danger-fg" />
    </AriaTextField>
  );
}

/**
 * The flow's "take the case" step (กดรับการรายงาน / กดรับยื่นอุทธรณ์). A Pending
 * case shows this in place of the decision form; pressing it moves the case
 * under investigation or review, and only then can a decision be recorded.
 */
export function AdminTakePanel({
  title,
  description,
  actionLabel,
  onTake,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onTake: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="sticky action-bar-bottom z-[20] flex flex-col gap-3 rounded-[12px] border border-line bg-surface p-4 sm:static sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-body font-medium">{title}</h2>
        <p className="text-body-sm text-ink-muted">{description}</p>
      </div>
      <AdminButton
        tone="primary"
        isLoading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await onTake();
          } finally {
            setBusy(false);
          }
        }}
        className="shrink-0"
      >
        {actionLabel}
      </AdminButton>
    </div>
  );
}
