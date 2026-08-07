"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Gift,
  Handshake,
  MessagesSquare,
  Menu,
  Package,
  Plus,
  Search,
  Store,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Button, LinkButton } from "./button";
import { Drawer, DrawerTrigger } from "./drawer";

/**
 * The app shell (docs/design/ia.md §4).
 *
 * Revised 2026-08-07 after a design review on the built product. Three things
 * were wrong and are fixed here:
 *
 *  1. **The brand was invisible.** A first fix made the bar solid green; the
 *     team preferred white. So the bar is white with green type and a green
 *     hairline, and the brand still leads because the wordmark, the links, the
 *     active pill, and the outlined Post button are all green. The colour now
 *     comes from what is *on* the bar rather than the bar itself.
 *  2. **The links were crammed left** with a long dead gap before the actions.
 *     Nav is centred in its own flexible column now.
 *  3. **Chat had no entry point.** Messages were folded into Deals (decision
 *     D1) with nothing left behind, so anyone who used the old site could not
 *     find them. Chat is back as its own item pointing at the deal list.
 */

export interface NavBadges {
  actions?: number;
  offers?: number;
  deals?: number;
}

interface NavEntry {
  href: string;
  label: string;
  icon: typeof Store;
  badge?: keyof NavBadges;
}

const NAV: NavEntry[] = [
  { href: "/", label: "Market", icon: Store },
  { href: "/offers", label: "Offers", icon: Handshake, badge: "offers" },
  { href: "/deals", label: "Deals", icon: Handshake, badge: "deals" },
  { href: "/chat", label: "Chat", icon: MessagesSquare },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/giveaway", label: "Giveaway", icon: Gift },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Count({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <span
      data-numeric
      className="grid min-w-5 place-items-center rounded-pill bg-tone-danger-solid px-1.5 text-[0.6875rem] font-semibold text-white"
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

export interface AppShellProps {
  children: React.ReactNode;
  badges?: NavBadges;
  user?: { name: string; avatarUrl?: string | null };
}

export function AppShell({ children, badges = {}, user }: AppShellProps) {
  const pathname = usePathname() ?? "";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-[50] w-full border-b border-green-200 bg-surface text-ink-brand shadow-flat">
        <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center gap-6 px-4 lg:px-8">
          <DrawerTrigger>
            <Button
              variant="ghost"
              size="icon-sm"
              pill
              aria-label="Open menu"
              className="text-ink-brand hover:bg-brand-subtle md:hidden"
            >
              <Menu className="size-5" />
            </Button>

            <Drawer title="KU Marketplace">
              <MobileMenu pathname={pathname} badges={badges} user={user} />
            </Drawer>
          </DrawerTrigger>

          <Link
            href="/"
            className="shrink-0 text-[1.0625rem] leading-[1.3] font-bold tracking-[-0.012em] text-ink-brand"
          >
            KU Marketplace
          </Link>

          {/* Centred and spread, rather than crammed against the wordmark.
              Visible from 768px: hiding the navigation below 1024 meant a
              browser window that is not maximised on a 1280 laptop had no nav
              at all. Measured on the built page, not guessed. */}
          <nav
            aria-label="Main"
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
          >
            {NAV.map(({ href, label, icon: Icon, badge }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  title={label}
                  className={cn(
                    "flex min-h-10 items-center gap-1.5 rounded-pill px-3 text-[0.9375rem] lg:px-4",
                    "transition-colors duration-[--dur-fast]",
                    active
                      ? "bg-brand-subtle font-semibold text-ink-brand"
                      : "text-ink-secondary hover:bg-green-50 hover:text-ink-brand",
                  )}
                >
                  {/* Between 768 and 1024 there is room for icons but not
                      words, which beats hiding the navigation entirely. */}
                  <Icon aria-hidden className="size-5 lg:hidden" />
                  <span className="hidden lg:inline">{label}</span>
                  <Count value={badge ? badges[badge] : undefined} />
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            {/* Outlined rather than filled: a solid green button next to green
                links made the bar read as two competing calls to action. */}
            <LinkButton
              variant="secondary"
              size="sm"
              href="/post"
              className="hidden border border-brand bg-transparent text-ink-brand shadow-none hover:bg-brand-subtle md:inline-flex"
            >
              <Plus className="size-4" />
              Post
            </LinkButton>

            <Button
              variant="ghost"
              size="icon-sm"
              pill
              aria-label="Search"
              className="text-ink-secondary hover:bg-brand-subtle hover:text-ink-brand"
            >
              <Search className="size-5" />
            </Button>

            <Link
              href="/notifications"
              aria-label="Notifications"
              className="grid size-9 place-items-center rounded-pill text-ink-secondary transition-colors hover:bg-brand-subtle hover:text-ink-brand"
            >
              <Bell className="size-5" />
            </Link>

            <Link
              href="/account"
              aria-label="Account"
              aria-current={isActive(pathname, "/account") ? "page" : undefined}
              className={cn(
                "grid size-9 place-items-center rounded-pill text-[0.75rem] font-semibold transition-colors",
                isActive(pathname, "/account")
                  ? "bg-brand text-on-brand"
                  : "bg-brand-subtle text-ink-brand hover:bg-green-200",
              )}
            >
              {user?.name ? (
                user.name.slice(0, 2)
              ) : (
                <User aria-hidden className="size-4" />
              )}
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-[100rem] flex-1 px-4 py-5 pb-12 lg:px-8 lg:py-7"
      >
        {children}
      </main>
    </div>
  );
}

function MobileMenu({
  pathname,
  badges,
  user,
}: {
  pathname: string;
  badges: NavBadges;
  user?: { name: string };
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <LinkButton href="/post" block size="lg">
        <Plus className="size-5" />
        Post an item
      </LinkButton>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          const count = badge ? badges[badge] : undefined;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-control px-3 text-[0.9375rem]",
                "transition-colors duration-[--dur-fast]",
                active
                  ? "bg-brand-subtle font-semibold text-ink-brand"
                  : "text-ink-secondary hover:bg-gray-100 hover:text-ink",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              {label}
              <span className="ml-auto">
                <Count value={count} />
              </span>
              {count ? (
                <span className="sr-only">{count} items need your attention</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
        <Link
          href="/notifications"
          className="flex min-h-12 items-center gap-3 rounded-control px-3 text-[0.9375rem] text-ink-secondary hover:bg-gray-100"
        >
          <Bell aria-hidden className="size-5" />
          Notifications
        </Link>
        <Link
          href="/account"
          className="flex min-h-12 items-center gap-3 rounded-control px-3 text-[0.9375rem] text-ink-secondary hover:bg-gray-100"
        >
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-pill bg-brand-subtle text-[0.6875rem] font-semibold text-ink-brand"
          >
            {user?.name?.slice(0, 2) ?? "?"}
          </span>
          {user?.name ?? "Account"}
        </Link>
      </div>
    </div>
  );
}
