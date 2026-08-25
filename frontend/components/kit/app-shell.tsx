"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Gift,
  Handshake,
  History,
  MessagesSquare,
  Menu,
  Package,
  Plus,
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
  // The route keeps its name; the label does not. The screen has been a record
  // of past deals since chat moved out of it, and "Deals" next to "Offers" —
  // with the same icon — read as two doors into the same room.
  { href: "/history", label: "History", icon: History, badge: "deals" },
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
  /**
   * The drawer has to be told to close.
   *
   * It used to be uncontrolled, and a link inside a modal does navigate — but
   * this layout is not remounted by that navigation, so the drawer stayed
   * mounted on top of the page it had just opened. Every item in the mobile
   * menu looked like it did nothing, Chat included.
   *
   * Every link in the panel therefore closes it on the way out.
   */
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Chat is a messenger, not a document: it fills the window under the header
   * and scrolls inside itself, so the page never scrolls and the composer stays
   * on the bottom edge. Every other route keeps the padded, growing column.
   */
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/");

  return (
    <div className={cn("flex flex-col", isChat ? "h-dvh" : "min-h-dvh")}>
      <header className="sticky top-0 z-[50] w-full bg-surface text-ink-brand shadow-raised">
        <div className="flex h-16 w-full items-center gap-6 px-4 lg:px-8">
          <DrawerTrigger isOpen={menuOpen} onOpenChange={setMenuOpen}>
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
              <MobileMenu
                pathname={pathname}
                badges={badges}
                user={user}
                onNavigate={() => setMenuOpen(false)}
              />
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
                    "relative flex min-h-10 items-center gap-1.5 px-3 text-[0.9375rem] lg:px-4",
                    "transition-colors duration-[--dur-fast]",
                    active
                      ? "font-semibold text-ink"
                      : "text-ink-secondary hover:text-ink-brand",
                  )}
                >
                  {/* Between 768 and 1024 there is room for icons but not
                      words, which beats hiding the navigation entirely. */}
                  <Icon aria-hidden className="size-5 lg:hidden" />
                  <span className="hidden lg:inline">{label}</span>
                  <Count value={badge ? badges[badge] : undefined} />
                  {/* Underline, not a pill — matches the reference layout: a
                      short brand-coloured bar under the active label only,
                      no filled background on the tab itself. */}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 -bottom-[3px] h-[2px] rounded-pill bg-brand lg:inset-x-4"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            {/* Tinted rather than filled: a solid green button next to green
                links made the bar read as two competing calls to action.
                `subtle` is that tint and is already what the avatar chip two
                places along uses, so the cluster is one family — this used to
                ask for `secondary` and then override its fill, shadow and
                border, which matched no variant in the system. `pill` because
                every one of its neighbours is round. */}
            <LinkButton
              variant="subtle"
              size="sm"
              pill
              href="/post"
              className="hidden md:inline-flex"
            >
              <Plus className="size-4" />
              Post
            </LinkButton>

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
                "grid size-9 place-items-center rounded-pill transition-colors",
                isActive(pathname, "/account")
                  ? "bg-brand text-on-brand"
                  : "bg-brand-subtle text-ink-brand hover:bg-green-200",
              )}
            >
              <User aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main"
        /* Full width, not a centred box. `mx-auto max-w-[100rem]` put a
           160px dead margin down both sides of a 1920 window and made every
           screen read as a card floating in the middle of the display. The
           page now runs edge to edge and only the reading measure of prose and
           form fields is capped — line length is legibility, not centring. */
        className={cn(
          "w-full flex-1",
          isChat
            ? "min-h-0 overflow-hidden"
            : "px-4 py-5 pb-12 lg:px-8 lg:py-7",
        )}
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
  onNavigate,
}: {
  pathname: string;
  badges: NavBadges;
  user?: { name: string };
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <LinkButton href="/post" block size="lg" onClick={onNavigate}>
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
              onClick={onNavigate}
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
          onClick={onNavigate}
          className="flex min-h-12 items-center gap-3 rounded-control px-3 text-[0.9375rem] text-ink-secondary hover:bg-gray-100"
        >
          <Bell aria-hidden className="size-5" />
          Notifications
        </Link>
        <Link
          href="/account"
          onClick={onNavigate}
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
