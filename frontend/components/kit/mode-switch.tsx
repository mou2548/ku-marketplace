import Link from "next/link";
import { ShieldCheck, Store } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Admins move between two modes: using the marketplace and moderating it. The
 * switch names both and marks the one in use, so the header says where the
 * admin is as well as offering the way across. Both headers render it, the
 * marketplace one with `current="market"` and the admin one with
 * `current="admin"`.
 */
export function ModeSwitch({
  current,
  className,
}: {
  current: "market" | "admin";
  className?: string;
}) {
  const modes = [
    { key: "market", href: "/feed", label: "Market", Icon: Store },
    { key: "admin", href: "/admin", label: "Admin", Icon: ShieldCheck },
  ] as const;

  return (
    <nav
      aria-label="Mode"
      className={cn(
        "inline-flex shrink-0 rounded-control border border-action-secondary-border bg-surface p-0.5",
        className,
      )}
    >
      {modes.map(({ key, href, label, Icon }) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-9 items-center gap-1.5 rounded-[9px] px-2.5 text-body-sm whitespace-nowrap transition-colors",
              active
                ? "bg-ink font-semibold text-page"
                : "font-medium text-ink-secondary hover:bg-surface-sunken hover:text-ink",
            )}
          >
            <Icon aria-hidden className="hidden size-4 sm:block" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
