/**
 * One place that decides how a date reads.
 *
 * The interface is English-only, but the readers are on a Thai campus, so the
 * day comes before the month (`en-GB`, not `en-US`) and every timestamp is
 * rendered in Bangkok time regardless of where the server or the browser sits.
 * A deal deadline that shifts by a day because a formatter defaulted to UTC is
 * a real bug, not a cosmetic one.
 *
 * Formatters are built once: `Intl.DateTimeFormat` is expensive enough that
 * constructing one per row shows up on long lists.
 */

/** Also handed to react-aria's `I18nProvider` so the calendar fixes date order. */
export const DATE_LOCALE = "en-GB";

const TIME_ZONE = "Asia/Bangkok";

const DATE = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const DATE_TIME = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** API payloads carry ISO strings; components usually hold a `Date` already. */
export type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "10 Aug 2026" — for anything dated rather than scheduled. */
export function formatDate(value: DateInput): string {
  return DATE.format(toDate(value));
}

/** "Mon 10 Aug, 13:00" — for appointments and deadlines, where the hour matters. */
export function formatDateTime(value: DateInput): string {
  return DATE_TIME.format(toDate(value));
}
