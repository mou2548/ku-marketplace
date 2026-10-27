"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  CreditCard,
  Flag,
  LayoutDashboard,
  Package,
  Scale,
  Users,
} from "lucide-react";

import type { AdminQueueCounts } from "@/lib/admin-labels";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    href: "/admin",
    label: "Dashboard",
    short: "Dashboard",
    icon: LayoutDashboard,
    count: null,
  },
  {
    href: "/admin/transactions",
    label: "Transactions",
    short: "Deals",
    icon: ArrowLeftRight,
    count: null,
  },
  {
    href: "/admin/users",
    label: "Users",
    short: "Users",
    icon: Users,
    count: null,
  },
  {
    href: "/admin/items",
    label: "Items",
    short: "Items",
    icon: Package,
    count: null,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    short: "Reports",
    icon: Flag,
    count: "reports",
  },
  {
    href: "/admin/appeals",
    label: "Appeals",
    short: "Appeals",
    icon: Scale,
    count: "appeals",
  },
  {
    href: "/admin/memberships",
    label: "Memberships",
    short: "Members",
    icon: CreditCard,
    count: "memberships",
  },
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  short: string;
  icon: typeof Flag;
  count: keyof AdminQueueCounts | null;
}>;

/** Dashboard is the workspace root, so it is active only on itself. */
function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Desktop: the left rail. Counts are plain grey numbers, not alarms. */
export function AdminSidebar({ counts }: { counts: AdminQueueCounts }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line px-3.5 pb-5 lg:flex">
      {/* As tall as the top bar, with the same bottom rule, so the two read
          as one line across the page. */}
      <p className="-mx-3.5 flex h-[4.25rem] shrink-0 items-center gap-2 border-b border-line px-5.5 font-semibold tracking-[-0.01em]">
        KU Marketplace{" "}
        <span className="text-caption font-normal text-ink-muted">Admin</span>
      </p>
      <nav aria-label="Admin sections" className="flex flex-col gap-0.5">
        {SECTIONS.map(({ href, label, icon: Icon, count }) => {
          const active = isActive(pathname, href);
          const n = count ? counts[count] : 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-body-sm transition-colors",
                active
                  ? "bg-surface-sunken font-medium text-ink"
                  : "text-ink-secondary hover:bg-surface-sunken hover:text-ink",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
              {n > 0 ? (
                <span data-numeric className="ml-auto text-meta text-ink-muted">
                  {n}
                  <span className="sr-only"> waiting</span>
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/feed"
        className="mt-auto flex min-h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-body-sm text-ink-secondary hover:bg-surface-sunken hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to marketplace
      </Link>
    </aside>
  );
}

/** Phone and tablet: the bottom tab bar. Seven sections do not fit at 360px,
 * so the bar scrolls sideways (team choice 2026-10-27) with every tab kept
 * at full touch size. */
export function AdminTabBar({ counts }: { counts: AdminQueueCounts }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin sections"
      className="fixed inset-x-0 bottom-0 z-[40] flex snap-x gap-1 overflow-x-auto overscroll-x-contain border-t border-line bg-page px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 [scrollbar-width:none] sm:justify-around lg:hidden"
    >
      {SECTIONS.map(({ href, short, icon: Icon, count }) => {
        const active = isActive(pathname, href);
        const n = count ? counts[count] : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-12 min-w-16 shrink-0 snap-start flex-col items-center justify-center gap-0.5 px-1.5 text-[0.66rem]",
              active ? "font-medium text-ink" : "text-ink-muted",
            )}
          >
            <Icon aria-hidden className="size-5" />
            {short}
            {n > 0 ? (
              <span
                data-numeric
                className="absolute right-0 top-1 rounded-pill bg-surface-sunken px-1.5 text-[0.6rem] leading-normal text-ink-secondary"
              >
                {n}
                <span className="sr-only"> waiting</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
