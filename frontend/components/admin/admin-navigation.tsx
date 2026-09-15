"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Scale, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const QUEUES = [
  { href: "/admin/reports", label: "Reports", icon: ShieldAlert },
  { href: "/admin/appeals", label: "Appeals", icon: Scale },
  { href: "/admin/memberships", label: "Memberships", icon: Crown },
] as const;

export interface AdminQueueCounts {
  reports: number;
  appeals: number;
  memberships: number;
}

function countFor(href: (typeof QUEUES)[number]["href"], counts: AdminQueueCounts) {
  if (href.endsWith("reports")) return counts.reports;
  if (href.endsWith("appeals")) return counts.appeals;
  return counts.memberships;
}

export function AdminNavigation({ counts }: { counts: AdminQueueCounts }) {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Moderation queues"
        className="hidden h-full items-stretch gap-5 lg:flex"
      >
        {QUEUES.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const count = countFor(href, counts);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-full items-center gap-2 border-b-2 px-0.5 text-body-sm transition-colors",
                active
                  ? "border-white font-semibold text-white"
                  : "border-transparent text-white/70 hover:text-white",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
              {count > 0 ? <QueueCount count={count} /> : null}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Moderation queues"
        className="fixed inset-x-0 bottom-0 z-[60] grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-3 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {QUEUES.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          const count = countFor(href, counts);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-0.5 text-meta",
                active ? "font-semibold text-ink-brand" : "text-ink-muted",
              )}
            >
              <span className="relative">
                <Icon aria-hidden className="size-5" />
                {count > 0 ? (
                  <span className="absolute -top-2 -right-3">
                    <QueueCount count={count} />
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate px-1">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function QueueCount({ count }: { count: number }) {
  return (
    <span
      data-numeric
      className="grid min-w-5 place-items-center rounded-pill bg-tone-danger-solid px-1.5 text-meta font-semibold text-white"
    >
      {count}
    </span>
  );
}
