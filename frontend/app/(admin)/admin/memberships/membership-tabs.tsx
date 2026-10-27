import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { id: "pending", label: "Waiting for review", href: "/admin/memberships" },
  { id: "all", label: "All memberships", href: "/admin/memberships?tab=all" },
] as const;

/** The review queue and the full membership list share one section. */
export function MembershipTabs({ current }: { current: "pending" | "all" }) {
  return (
    <nav
      aria-label="Membership views"
      className="inline-flex max-w-full flex-wrap self-start rounded-[8px] border border-line-default p-0.5"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center rounded-[6px] px-3 text-body-sm transition-colors",
            tab.id === current
              ? "bg-surface-sunken font-medium text-ink"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
