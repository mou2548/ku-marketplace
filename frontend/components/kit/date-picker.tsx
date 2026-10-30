"use client";

import { toCalendarDate, type CalendarDate } from "@internationalized/date";
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
  TimeField,
  I18nProvider,
  type DatePickerProps as AriaDatePickerProps,
  type DateValue,
  type TimeValue,
} from "react-aria-components";

import { getCopy } from "@/lib/copy";
import { keepWithinBounds } from "@/lib/date-bounds";
import { DATE_LOCALE, formatFieldDate, formatFieldDateTime } from "@/lib/date-format";

import { cn } from "@/lib/utils";

import { Button as DoneButton } from "./button";
import { FieldError, FieldHint, Label } from "./field";

/**
 * Needed in three places the flows specify a time window:
 *   - appointment cards (trust gap T3)
 *   - giveaway registration deadline and pickup window (research R7)
 *   - the seller's estimated delivery date
 *
 * A fixed British Gregorian locale keeps the input day-first (dd/mm/yyyy, the
 * Thai convention) in every browser, with the full year: a two-digit year hid
 * that a typed "2020" was in the past.
 * The segmented input stays keyboard operable — a plain `<input type="date">` renders
 * inconsistently across Thai Android browsers, and a JS date library would cost
 * more than the whole component.
 */
export interface DatePickerFieldProps<T extends DateValue> extends Omit<
  AriaDatePickerProps<T>,
  "children"
> {
  label?: string;
  hint?: string;
  errorMessage?: string;
  className?: string;
  /**
   * Show a time editor inside the popover and keep it open through a date
   * selection, so picking a day doesn't bounce the user out to hunt for the
   * time segments in the closed field. Only meaningful when `value` carries
   * a time component (`CalendarDateTime`/`ZonedDateTime`) — leave this off
   * for a plain `CalendarDate` field, which has no time to set.
   */
  showTimeField?: boolean;
}

export function DatePickerField<T extends DateValue>({
  label,
  hint,
  errorMessage,
  className,
  showTimeField = false,
  ...props
}: DatePickerFieldProps<T>) {
  const t = getCopy("datePicker");
  /**
   * `TimeField` reports back a bare `TimeValue` (hour/minute/second only) —
   * it has no year/month/day of its own. Passing that straight to the
   * outer `onChange` overwrote the date fields in state with a value
   * missing them, which crashed anything downstream expecting a full
   * `CalendarDateTime`/`ZonedDateTime` (`.add()`, `minValue` comparisons).
   * It also reports `null` while a segment is mid-edit (e.g. cleared to
   * retype), which must not blank out the date either. So: merge the time
   * fields onto the existing full value, and ignore the callback entirely
   * when there is no date yet to merge onto or the time is mid-edit.
   */
  function handleTimeChange(time: TimeValue | null) {
    if (!props.value || !time) return;
    const merged = (
      props.value as unknown as {
        set: (fields: {
          hour: number;
          minute: number;
          second: number;
          millisecond: number;
        }) => T;
      }
    ).set({
      hour: time.hour,
      minute: time.minute,
      second: time.second,
      millisecond: time.millisecond,
    });
    props.onChange?.(merged as unknown as Parameters<NonNullable<typeof props.onChange>>[0]);
  }

  /**
   * Every pick passes through here so a day chosen on the day a bound falls on
   * keeps a time the bound allows (see `keepWithinBounds`).
   */
  function commit(next: T) {
    props.onChange?.(
      keepWithinBounds(next, props.minValue, props.maxValue) as unknown as Parameters<
        NonNullable<typeof props.onChange>
      >[0],
    );
  }

  /**
   * A day of the neighbouring month, shown to fill the first or last week.
   * The calendar leaves those unselectable, which read as "that day is not
   * allowed" when the day is just in the other month (the 31st shown greyed at
   * the top of November). They are made clickable here when the field's own
   * range allows them; the calendar jumps to the month picked. Pointer only:
   * the keyboard already crosses months with the arrow keys.
   */
  function canPickOutside(date: CalendarDate): boolean {
    if (!props.value || props.isDisabled || props.isReadOnly) return false;
    if (props.minValue && date.compare(toCalendarDate(props.minValue)) < 0) return false;
    if (props.maxValue && date.compare(toCalendarDate(props.maxValue)) > 0) return false;
    return !props.isDateUnavailable?.(date);
  }

  function pickOutside(date: CalendarDate, close: () => void) {
    const current = props.value as unknown as {
      set: (fields: { year: number; month: number; day: number }) => T;
    } | null;
    if (!current) return;
    commit(current.set({ year: date.year, month: date.month, day: date.day }));
    if (!showTimeField) close();
  }

  /** A bound's date, with its time when it has one. */
  function describeBound(bound: DateValue): string {
    return "hour" in bound ? formatFieldDateTime(bound) : formatFieldDate(bound);
  }

  return (
    // This calendar-only context fixes date order; there is no app language switch.
    <I18nProvider locale={DATE_LOCALE}>
      <AriaDatePicker
        {...props}
        onChange={(next) => {
          // Only a change of day is adjusted. Typing in the time segments goes
          // through untouched: moving the value under the cursor would make an
          // hour like "17" impossible to type one digit at a time.
          const before = props.value;
          const dayChanged =
            !before ||
            !next ||
            toCalendarDate(next as DateValue).compare(toCalendarDate(before)) !== 0;
          if (next && dayChanged) commit(next as unknown as T);
          else props.onChange?.(next);
        }}
        shouldCloseOnSelect={showTimeField ? false : undefined}
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
        {/* react-aria's own range message formats the bound in the browser's
            locale ("10/28/2026"), the opposite order to the field above it. */}
        <FieldError>
          {errorMessage ??
            ((validation) =>
              validation.validationDetails.rangeUnderflow && props.minValue
                ? t("minDate", { date: describeBound(props.minValue) })
                : validation.validationDetails.rangeOverflow && props.maxValue
                  ? t("maxDate", { date: describeBound(props.maxValue) })
                  : validation.validationErrors.join(" "))}
        </FieldError>

        <Popover
          className={cn(
            "z-[90] rounded-panel bg-surface p-4 shadow-overlay",
            "data-[entering]:anim-pop-in",
            "data-[exiting]:anim-fade-out",
          )}
        >
          <Dialog className="outline-none">
            {({ close }) => (
              <div className="flex flex-col gap-3">
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
                            // A neighbouring month's day is "disabled" to the
                            // calendar but may be pickable (below); its own text
                            // colour, not a blanket fade, says which.
                            "data-[outside-month]:data-[disabled]:opacity-100",
                            "data-[unavailable]:line-through data-[unavailable]:opacity-40",
                          )}
                        >
                          {({ formattedDate, isOutsideMonth }) => {
                            if (!isOutsideMonth) return formattedDate;
                            // Anything left visible from another month can be
                            // clicked. The ones that cannot are hidden rather
                            // than faded: two shades of grey did not say which
                            // was which.
                            if (!canPickOutside(date)) {
                              return (
                                <span aria-hidden className="invisible">
                                  {formattedDate}
                                </span>
                              );
                            }
                            return (
                              <span
                                aria-hidden
                                onClick={() => pickOutside(date, close)}
                                className="grid size-full cursor-pointer place-items-center rounded-control font-medium text-ink-secondary hover:bg-brand-subtle"
                              >
                                {formattedDate}
                              </span>
                            );
                          }}
                        </CalendarCell>
                      )}
                    </CalendarGridBody>
                  </CalendarGrid>
                </Calendar>

                {showTimeField ? (
                  <>
                    <div className="h-px bg-line" />
                    <div className="flex items-center justify-between gap-3">
                      {/* `TimeField` only edits the time fields but reports back a
                        bare `TimeValue`, so `handleTimeChange` merges it onto the
                        outer date value rather than replacing it outright. The
                        `value` cast is safe because this branch only renders when
                        the caller opted in via `showTimeField`, which implies `T`
                        carries a time component. */}
                      <Group className="flex h-11 flex-1 items-center gap-2 rounded-control bg-surface-sunken px-3.5 shadow-sunken">
                        <TimeField
                          value={props.value as unknown as TimeValue | null}
                          onChange={handleTimeChange}
                        >
                          <DateInput className="flex items-center gap-0.5 text-body">
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
                        </TimeField>
                      </Group>
                      <DoneButton size="sm" onPress={close}>
                        Done
                      </DoneButton>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </Dialog>
        </Popover>
      </AriaDatePicker>
    </I18nProvider>
  );
}
