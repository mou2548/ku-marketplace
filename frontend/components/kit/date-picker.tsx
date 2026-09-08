"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Popover,
  type DatePickerProps as AriaDatePickerProps,
  type DateValue,
} from "react-aria-components";

import { cn } from "@/lib/utils";

import { FieldError, FieldHint, Label } from "./field";

/**
 * Needed in three places the flows specify a time window:
 *   - appointment cards (trust gap T3)
 *   - giveaway registration deadline and pickup window (research R7)
 *   - the seller's estimated delivery date
 *
 * `react-aria-components` gives a segmented date input that respects the user's
 * locale and is fully keyboard operable — a plain `<input type="date">` renders
 * inconsistently across Thai Android browsers, and a JS date library would cost
 * more than the whole component.
 */
export interface DatePickerFieldProps<T extends DateValue>
  extends Omit<AriaDatePickerProps<T>, "children"> {
  label?: string;
  hint?: string;
  errorMessage?: string;
  className?: string;
}

export function DatePickerField<T extends DateValue>({
  label,
  hint,
  errorMessage,
  className,
  ...props
}: DatePickerFieldProps<T>) {
  return (
    <AriaDatePicker
      {...props}
      className={cn("flex flex-col gap-1.5", className)}
    >
      {label ? <Label>{label}</Label> : null}

      <Group className="flex h-12 items-center gap-2 rounded-control bg-surface-sunken px-3.5 shadow-sunken">
        <DateInput className="flex flex-1 items-center gap-0.5 text-body">
          {(segment) => (
            <DateSegment
              segment={segment}
              className={cn(
                "rounded-[0.25rem] px-0.5 tabular-nums outline-none",
                "data-[focused]:bg-brand data-[focused]:text-on-brand",
                "data-[placeholder]:text-ink-disabled",
              )}
            />
          )}
        </DateInput>
        <Button
          className="touch-target grid size-8 shrink-0 place-items-center rounded-chip text-ink-muted data-[hovered]:bg-gray-200"
          aria-label="Pick a date from the calendar"
        >
          <CalendarDays aria-hidden className="size-4" />
        </Button>
      </Group>

      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <FieldError>{errorMessage}</FieldError>

      <Popover
        className={cn(
          "z-[90] rounded-panel bg-surface p-4 shadow-overlay",
          "data-[entering]:anim-pop-in",
          "data-[exiting]:anim-fade-out",
        )}
      >
        <Dialog className="outline-none">
          <Calendar className="flex flex-col gap-3">
            <header className="flex items-center justify-between gap-2">
              <Button
                slot="previous"
                aria-label="Previous month"
                className="touch-target grid size-9 place-items-center rounded-control text-ink-secondary data-[hovered]:bg-gray-100"
              >
                <ChevronLeft aria-hidden className="size-4" />
              </Button>
              <Heading className="text-body font-semibold" />
              <Button
                slot="next"
                aria-label="Next month"
                className="touch-target grid size-9 place-items-center rounded-control text-ink-secondary data-[hovered]:bg-gray-100"
              >
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            </header>

            <CalendarGrid className="border-collapse">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="pb-1 text-meta font-medium text-ink-muted">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className={cn(
                      "touch-target m-0.5 grid size-9 cursor-pointer place-items-center rounded-control",
                      "text-body-sm tabular-nums outline-none",
                      "data-[hovered]:bg-brand-subtle",
                      "data-[selected]:bg-brand data-[selected]:font-semibold data-[selected]:text-on-brand",
                      "data-[outside-month]:text-ink-disabled",
                      "data-[disabled]:opacity-35",
                      "data-[unavailable]:line-through data-[unavailable]:opacity-40",
                    )}
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}
