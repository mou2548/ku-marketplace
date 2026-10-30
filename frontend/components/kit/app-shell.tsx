"use client";

import { getCopy } from "@/lib/copy";
import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Gift,
  Handshake,
  History,
  LogOut,
  MessagesSquare,
  Menu,
  Package,
  Plus,
  Store,
} from "lucide-react";

import { logout } from "@/lib/actions/auth";
import {
  DEALS_SEEN_EVENT,
  parseSeenKeys,
  pruneSeenKeys,
  readSeenCookie,
  serializeSeenKeys,
  unseenCount,
  writeSeenKeys,
} from "@/lib/deal-badge";
import { cn } from "@/lib/utils";

import { Button, LinkButton } from "./button";
import { ThemeSwitch } from "@/components/patterns/theme-switch";

import { Drawer, DrawerTrigger } from "./drawer";
import { ModeSwitch } from "./mode-switch";
import { RestrictedShell, type Restriction } from "./restricted-shell";
import { UserAvatar } from "./user-avatar";

/**
 * White/black consumer chrome with KU green reserved for identity, active
 * navigation, and state. The logo already contains "KU", so the adjacent
 * wordmark deliberately says only "Marketplace".
 */

export interface NavBadges {
  actions?: number;
  offers?: number;
  deals?: number;
}

interface NavEntry {
  href: string;
  /** Message key under `nav.`. */
  labelKey: string;
  icon: typeof Store;
  badge?: keyof NavBadges;
  /**
   * On the phone tab bar. Giveaway joined as a sixth tab (owner decision
   * 2026-10-30): tucked in the drawer, students did not find it on a phone
   * at all and only met it in landscape, where the top bar appears. Six is
   * the ceiling — at 360px each tab is 60px, still past the 44px target.
   */
  onTabBar?: true;
}

const NAV: NavEntry[] = [
  { href: "/feed", labelKey: "nav.market", icon: Store, onTabBar: true },
  { href: "/offers", labelKey: "nav.offers", icon: Handshake, badge: "offers", onTabBar: true },
  // The route keeps its name; the label does not. The screen has been a record
  // of past deals since chat moved out of it, and "Deals" next to "Offers" —
  // with the same icon — read as two doors into the same room.
  { href: "/history", labelKey: "nav.history", icon: History, badge: "deals", onTabBar: true },
  { href: "/chat", labelKey: "nav.chat", icon: MessagesSquare, onTabBar: true },
  { href: "/inventory", labelKey: "nav.inventory", icon: Package, onTabBar: true },
  { href: "/giveaway", labelKey: "nav.giveaway", icon: Gift, onTabBar: true },
];

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

/**
 * A dot, not a number. The count rendered as a bare "1" that sat under the
 * tab-bar icon and read as part of the label — and the exact number is not what
 * the navigation is for: it only has to say "something here wants you". The
 * number survives for screen readers, where it costs nothing.
 */
function Dot({ value, className }: { value?: number; className?: string }) {
  const t = getCopy();
  if (!value) return null;
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-pill bg-tone-danger-solid",
          className,
        )}
      />
      <span className="sr-only">{t("nav.needsYou", { count: value })}</span>
    </>
  );
}

/** Re-read the cookie in this tab after a write, and when the tab comes back
 * (another tab may have opened History meanwhile). */
function subscribeSeen(onChange: () => void) {
  const onVisible = () => document.visibilityState === "visible" && onChange();
  window.addEventListener(DEALS_SEEN_EVENT, onChange);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener(DEALS_SEEN_EVENT, onChange);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export interface AppShellProps {
  children: React.ReactNode;
  badges?: NavBadges;
  /**
   * One key per deal waiting on the viewer, at its current step
   * (`lib/deal-badge`). Null when the deals could not be read.
   */
  dealKeys?: string[] | null;
  /** The seen-deals cookie as the server read it, for the first paint. */
  seenDeals?: string;
  /** That cookie's name; per account. */
  seenCookie?: string;
  user?: { name: string; avatarUrl?: string | null; isAdmin?: boolean };
  /** Set for a suspended or banned account: it gets the restricted shell. */
  restriction?: Restriction | null;
}

export function AppShell({
  children,
  badges: serverBadges = {},
  dealKeys = null,
  seenDeals = "",
  seenCookie,
  user,
  restriction,
}: AppShellProps) {
  const t = getCopy();
  const pathname = usePathname() ?? "";

  /**
   * The History dot goes out once the History list has been opened and comes
   * back when a deal waits at a step not seen there (lib/deal-badge.ts). The
   * list page writes the cookie (history/mark-deals-seen.tsx); here it is
   * read, and pruned to the deals still waiting, so a deal that leaves the
   * list and later returns counts as new.
   */
  const onHistoryList = pathname === "/history";
  const seenRaw = useSyncExternalStore(
    subscribeSeen,
    () => (seenCookie ? readSeenCookie(seenCookie) : ""),
    () => seenDeals,
  );
  const seen = parseSeenKeys(seenRaw);
  const pruned = dealKeys ? serializeSeenKeys(pruneSeenKeys(seen, dealKeys)) : null;
  useEffect(() => {
    // On the list the page writes the cookie itself; this effect runs after
    // the page's and would overwrite it with the older keys.
    if (onHistoryList || !seenCookie || pruned === null || pruned === seenRaw) return;
    writeSeenKeys(seenCookie, parseSeenKeys(pruned));
  }, [onHistoryList, seenCookie, pruned, seenRaw]);
  const badges: NavBadges = {
    ...serverBadges,
    deals: onHistoryList ? 0 : unseenCount(dealKeys ?? [], seen),
  };
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
  /* A room owns the bottom edge — its composer sits there. The chat list is a
     list like any other and keeps the bar. */
  const isChatRoom = pathname.startsWith("/chat/");
  const showTabBar = !isChatRoom;

  if (restriction) {
    return (
      <RestrictedShell restriction={restriction} user={user}>
        {children}
      </RestrictedShell>
    );
  }

  return (
    <div className={cn("flex flex-col", isChat ? "h-dvh" : "min-h-dvh")}>
      <header className="sticky top-0 z-[50] w-full border-b border-line bg-surface text-ink-brand">
        <div className="flex h-[4.25rem] w-full items-center gap-3 px-3 sm:px-4 lg:gap-5 lg:px-8">
          <DrawerTrigger isOpen={menuOpen} onOpenChange={setMenuOpen}>
            <Button
              variant="ghost"
              size="icon-sm"
              pill
              aria-label={t("nav.openMenu")}
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
            href="/feed"
            aria-label={t("nav.brand")}
            className="group flex shrink-0 items-center gap-2.5 rounded-control"
          >
            <span className="grid size-10 place-items-center overflow-hidden rounded-control bg-white shadow-flat">
              <Image
                src="/images/ku-logo.png"
                alt=""
                width={32}
                height={32}
                className="size-8 object-contain"
                priority
              />
            </span>
            <span className="hidden text-body-lg leading-[1.2] font-bold tracking-[-0.018em] text-ink-brand sm:block">
              Marketplace
            </span>
          </Link>

          {/* Centred and spread, rather than crammed against the wordmark.
              Visible from 768px: hiding the navigation below 1024 meant a
              browser window that is not maximised on a 1280 laptop had no nav
              at all. Measured on the built page, not guessed. */}
          <nav
            aria-label={t("nav.main")}
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
          >
            {NAV.map(({ href, labelKey, icon: Icon, badge }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  title={t(labelKey)}
                  className={cn(
                    "relative flex min-h-10 items-center gap-1.5 px-3 text-body-sm lg:px-4",
                    "transition-colors duration-[--dur-fast]",
                    active
                      ? "font-semibold text-ink-brand"
                      : "text-ink-secondary hover:text-ink-brand",
                  )}
                >
                  {/* Between 768 and 1024 there is room for icons but not
                      words, which beats hiding the navigation entirely. */}
                  <Icon aria-hidden className="size-5 lg:hidden" />
                  <span className="hidden lg:inline">{t(labelKey)}</span>
                  <Dot value={badge ? badges[badge] : undefined} />
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 -bottom-[0.9rem] h-0.5 rounded-pill bg-brand lg:inset-x-4"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            {/* Below 640px the header has no room for it; the drawer carries it. */}
            {user?.isAdmin && (
              <ModeSwitch current="market" className="mr-1 hidden sm:inline-flex" />
            )}
            <ThemeSwitch />

            <Link
              href="/notifications"
              aria-label={t("nav.notifications")}
              className="touch-target grid size-10 place-items-center rounded-pill text-ink-secondary transition-colors hover:bg-brand-subtle hover:text-ink-brand"
            >
              <Bell className="size-5" />
            </Link>

            <Link
              href="/account"
              aria-label={t("nav.account")}
              aria-current={isActive(pathname, "/account") ? "page" : undefined}
              title={user?.name}
              className={cn(
                "touch-target grid size-10 place-items-center rounded-pill transition-shadow",
                isActive(pathname, "/account")
                  ? "ring-2 ring-brand ring-offset-2 ring-offset-surface"
                  : "hover:ring-2 hover:ring-[var(--brand-subtle-hover)]",
              )}
            >
              <UserAvatar name={user?.name ?? "?"} avatarUrl={user?.avatarUrl} />
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
          // Inherited by every screen: user text (names, notes, messages) can
          // hold an unbroken URL that would otherwise widen the page.
          "w-full flex-1 wrap-anywhere",
          isChat
            ? "min-h-0 overflow-hidden"
            : "px-3 py-4 pb-12 sm:px-4 lg:px-8 lg:py-6",
          /* Clear the fixed bar, plus the home indicator under it. */
          showTabBar && !isChat && "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-12",
        )}
      >
        {children}
      </main>

      {/* CLAUDE.md §5 specifies a bottom tab bar on mobile and the app did not
          have one: below 768px the only navigation was a hamburger, so every
          move between the five places a deal lives cost two taps and a
          disclosure. The drawer stays for everything else. */}
      {showTabBar ? (
        <nav
          aria-label={t("nav.main")}
          className="fixed inset-x-0 bottom-0 z-[50] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(18_43_29_/_0.06)] md:hidden"
        >
          <ul className="flex items-stretch">
            {NAV.filter((entry) => entry.onTabBar).map(
              ({ href, labelKey, icon: Icon, badge }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href} className="min-w-0 flex-1">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 max-[380px]:px-0",
                        "transition-colors duration-[--dur-fast]",
                        active ? "font-semibold text-ink-brand" : "text-ink-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "relative rounded-pill px-3 py-1 transition-colors",
                          active && "bg-brand-subtle",
                        )}
                      >
                        <Icon aria-hidden className="size-5" />
                        <Dot
                          value={badge ? badges[badge] : undefined}
                          /* Top-right of the icon, clear of the active pill, with
                             a ring so it reads as a dot and not a smudge on the
                             tinted background. */
                          className="absolute -top-0.5 right-1.5 ring-2 ring-surface"
                        />
                      </span>
                      {/* Six tabs at 360px leave 60px each, and "Inventory"
                          and "Giveaway" were cut to "Invento…" at 12px
                          (retest R06). Narrow phones get 11px with tighter
                          tracking instead of a shorter word. */}
                      <span className="max-w-full truncate text-meta leading-none max-[380px]:text-[0.6875rem] max-[380px]:tracking-[-0.01em]">
                        {t(labelKey)}
                      </span>
                    </Link>
                  </li>
                );
              },
            )}
          </ul>
        </nav>
      ) : null}
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
  user?: { name: string; avatarUrl?: string | null; isAdmin?: boolean };
  onNavigate: () => void;
}) {
  const t = getCopy();
  return (
    <div className="flex h-full flex-col gap-3">
      {user?.isAdmin && <ModeSwitch current="market" className="self-start sm:hidden" />}
      <LinkButton href="/post" block size="lg" onClick={onNavigate}>
        <Plus className="size-5" />{t("nav.postAnItem")}</LinkButton>

      <nav aria-label={t("nav.main")} className="flex flex-col gap-0.5">
        {NAV.map(({ href, labelKey, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          const count = badge ? badges[badge] : undefined;

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-control px-3 text-body",
                "transition-colors duration-[--dur-fast]",
                active
                  ? "bg-brand-subtle font-semibold text-ink-brand"
                  : "text-ink-secondary hover:bg-gray-100 hover:text-ink",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              {t(labelKey)}
              <span className="ml-auto flex items-center">
                <Dot value={count} />
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
        <Link
          href="/notifications"
          onClick={onNavigate}
          className="flex min-h-12 items-center gap-3 rounded-control px-3 text-body text-ink-secondary hover:bg-gray-100"
        >
          <Bell aria-hidden className="size-5" />{t("nav.notifications")}</Link>
        <Link
          href="/account"
          onClick={onNavigate}
          className="flex min-h-12 items-center gap-3 rounded-control px-3 text-body text-ink-secondary hover:bg-gray-100"
        >
          <UserAvatar
            name={user?.name ?? "?"}
            avatarUrl={user?.avatarUrl}
            size="sm"
          />
          {user?.name ?? "Account"}
        </Link>
        {/* Signing out used to be reachable only from the foot of /account
            (audit F09). Same server action as that page. */}
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-body text-tone-danger-fg transition-colors hover:bg-tone-danger-bg"
          >
            <LogOut aria-hidden className="size-5 shrink-0" />
            {t("account.signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
