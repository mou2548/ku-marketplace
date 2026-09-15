"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";

import type { Locale } from "@/lib/i18n/config";
import { setLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const LABEL: Record<Locale, string> = {
  en: "EN",
  th: "ไทย",
};

/**
 * Two states, so this is a toggle rather than a menu: a select for a binary
 * choice costs a tap and a decision that a toggle does not.
 *
 * Each label is written in its own language. A Thai reader looking for Thai
 * should not have to find the word "Thai" in English first.
 *
 * The locale lives in a cookie, so switching means writing it and re-rendering
 * the server components — `router.refresh()`, not a navigation. The URL does
 * not change, which is the whole point of the cookie approach.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const next: Locale = locale === "en" ? "th" : "en";

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Switch to ${next === "th" ? "Thai" : "English"}`}
      onClick={() =>
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        })
      }
      className={cn(
        "touch-target flex items-center gap-1.5 rounded-pill px-3 text-body-sm font-medium",
        "text-ink-secondary transition-colors duration-[--dur-fast]",
        "hover:bg-brand-subtle hover:text-ink-brand disabled:opacity-60",
        className,
      )}
    >
      <Languages aria-hidden className="size-4 shrink-0" />
      <span>{LABEL[locale]}</span>
    </button>
  );
}
