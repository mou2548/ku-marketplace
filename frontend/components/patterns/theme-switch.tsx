"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const STORAGE_KEY = "ku-theme";
const THEME_EVENT = "ku-theme-change";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    document.documentElement.dataset.theme = stored;
    document.documentElement.style.colorScheme = stored;
    queueMicrotask(onStoreChange);
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_EVENT, onStoreChange);
  };
}

export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations();
  const theme = useSyncExternalStore(
    subscribe,
    currentTheme,
    () => "light",
  );

  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = nextTheme === "dark" ? t("nav.useDarkTheme") : t("nav.useLightTheme");

  function toggleTheme() {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    document.cookie = `${STORAGE_KEY}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "touch-target grid size-10 place-items-center rounded-pill text-ink-secondary",
        "transition-colors duration-[--dur-fast] hover:bg-brand-subtle hover:text-ink-brand",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun aria-hidden className="size-[1.125rem]" />
      ) : (
        <Moon aria-hidden className="size-[1.125rem]" />
      )}
    </button>
  );
}
