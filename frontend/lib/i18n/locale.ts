"use server";

import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  parseLocale,
  type Locale,
} from "./config";

/**
 * The interface is bilingual and the locale lives in a cookie, not the URL.
 *
 * `next.config.ts` carries a permanent redirect map from `docs/design/ia.md`
 * §6 — 57 old routes collapsed into 36 — and a `/th` or `/en` prefix would
 * invalidate every one of them. The trade is real and recorded: a link cannot
 * carry a language, so sharing a page shows the recipient their own locale
 * rather than the sender's, and search engines see one language per URL. For a
 * closed campus product where every reader is signed in, that costs less than
 * breaking every bookmark.
 */

/**
 * The cookie wins. Failing that, the browser's own preference decides, so a
 * Thai-configured phone opens in Thai without anyone touching a switch —
 * `research.md` says students read English chrome and write Thai content, and
 * that is a claim about habit, not a setting anyone has confirmed.
 */
export async function getLocale(): Promise<Locale> {
  const fromCookie = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("th") ? "th" : DEFAULT_LOCALE;
}

export async function setLocale(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });
}
