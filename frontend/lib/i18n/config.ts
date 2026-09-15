/**
 * Locale constants, importable from anywhere.
 *
 * Separate from `locale.ts` because that file is `"use server"`, and a server
 * action module may only export async functions — a type or a constant there
 * fails the build rather than being ignored.
 */
export type Locale = "en" | "th";

export const LOCALES: readonly Locale[] = ["en", "th"];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "ku-locale";
/** A year: this is a preference, not a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseLocale(value: string | undefined | null): Locale | undefined {
  return LOCALES.includes(value as Locale) ? (value as Locale) : undefined;
}
