import { toCalendarDate, type DateValue } from "@internationalized/date";

type TimeFields = {
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

/** True for a value that carries a time of day (`CalendarDateTime`/`ZonedDateTime`). */
export function hasTime(value: DateValue): value is DateValue & TimeFields {
  return "hour" in value;
}

function withTimeOf<T extends DateValue>(value: T, bound: DateValue & TimeFields): T {
  return (value as unknown as { set: (fields: TimeFields) => T }).set({
    hour: bound.hour,
    minute: bound.minute,
    second: bound.second,
    millisecond: bound.millisecond,
  });
}

/**
 * Keeps a picked date-and-time inside `minValue`/`maxValue` when the pick is on
 * the same day as a bound and only the time of day is out of range.
 *
 * Picking a day in a calendar keeps the field's old time. Choosing the day a
 * range starts on, with a time before the range's own start, would otherwise
 * turn the field red even though the calendar let the day be chosen — "same day"
 * is a perfectly good answer ("close registration and collect on the 31st").
 * The time moves to the nearest allowed one instead. A value on a different day,
 * or one already inside the range, is returned unchanged.
 */
export function keepWithinBounds<T extends DateValue>(
  value: T,
  minValue?: DateValue | null,
  maxValue?: DateValue | null,
): T {
  if (!hasTime(value)) return value;
  const day = toCalendarDate(value);
  if (
    minValue &&
    hasTime(minValue) &&
    value.compare(minValue) < 0 &&
    day.compare(toCalendarDate(minValue)) === 0
  ) {
    return withTimeOf(value, minValue);
  }
  if (
    maxValue &&
    hasTime(maxValue) &&
    value.compare(maxValue) > 0 &&
    day.compare(toCalendarDate(maxValue)) === 0
  ) {
    return withTimeOf(value, maxValue);
  }
  return value;
}
