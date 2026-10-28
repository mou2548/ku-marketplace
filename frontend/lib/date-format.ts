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

// Node and the browser can ship different CLDR data, and en-GB's abbreviated
// September in particular has rendered as both "Sep" and "Sept" across
// versions — enough that the server and the client render different text
// for the same date, which fails SSR hydration outright. `Intl` is still the
// right tool for the timezone conversion (Bangkok, regardless of where the
// server or the browser sits), but only its *numeric* output is safe to
// trust across environments — the month/weekday name tables are not. So
// this pulls numeric day/month/year/hour/minute out of `Intl` and spells the
// month and weekday out from a fixed table instead of asking `Intl` for
// their names.
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const NUMERIC_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

/** API payloads carry ISO strings; components usually hold a `Date` already. */
export type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

interface BangkokParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday .. 6 = Saturday */
  weekday: number;
}

function bangkokParts(value: DateInput): BangkokParts {
  const parts = NUMERIC_PARTS.formatToParts(toDate(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  // Weekday from the Bangkok-local y/m/d via a UTC anchor date — pure
  // arithmetic, so no Intl weekday table is involved either.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, hour: get("hour") % 24, minute: get("minute"), weekday };
}

/** "10 Aug 2026" — for anything dated rather than scheduled. */
export function formatDate(value: DateInput): string {
  const { year, month, day } = bangkokParts(value);
  return `${day} ${MONTH_SHORT[month - 1]} ${year}`;
}

/**
 * "Mon 10 Aug, 13:00" — for appointments and deadlines, where the hour matters.
 *
 * The year is left out only when it is the current one (in Bangkok). Without
 * it, a meetup saved for 2020 read "Wed 1 Jan, 10:00" and passed for next
 * January. `now` exists for tests.
 */
export function formatDateTime(value: DateInput, now: DateInput = Date.now()): string {
  const { year, month, day, hour, minute, weekday } = bangkokParts(value);
  const yearPart = year === bangkokParts(now).year ? "" : ` ${year}`;
  return `${WEEKDAY_SHORT[weekday]} ${day} ${MONTH_SHORT[month - 1]}${yearPart}, ${pad2(hour)}:${pad2(minute)}`;
}

/**
 * "28/10/2026" — a calendar date in the same day/month/year order as the date
 * field, for messages about what the field accepts. Takes the field's own
 * parts, so no timezone is involved.
 */
export function formatFieldDate(date: { year: number; month: number; day: number }): string {
  return `${pad2(date.day)}/${pad2(date.month)}/${date.year}`;
}
