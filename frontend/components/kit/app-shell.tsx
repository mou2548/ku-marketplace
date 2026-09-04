"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Image from "next/image";
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
import { LocaleSwitch } from "@/components/patterns/locale-switch";
import { ThemeSwitch } from "@/components/patterns/theme-switch";

import { Drawer, DrawerTrigger } from "./drawer";

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
  /** Message key under `nav.` — the labels are rendered in two languages. */
  labelKey: string;
  icon: typeof Store;
  badge?: keyof NavBadges;
  /**
   * On the phone tab bar. Five at most — past that the targets get too narrow
   * to hit and the bar stops reading as a set of places. Giveaway is the one
   * that stays in the drawer: it is the secondary job in PRODUCT.md, and the
   * drawer still lists everything.
   */
  onTabBar?: true;
}

const NAV: NavEntry[] = [
  { href: "/", labelKey: "nav.market", icon: Store, onTabBar: true },
  { href: "/offers", labelKey: "nav.offers", icon: Handshake, badge: "offers", onTabBar: true },
  // The route keeps its name; the label does not. The screen has been a record
  // of past deals since chat moved out of it, and "Deals" next to "Offers" —
  // with the same icon — read as two doors into the same room.
  { href: "/history", labelKey: "nav.history", icon: History, badge: "deals", onTabBar: true },
  { href: "/chat", labelKey: "nav.chat", icon: MessagesSquare, onTabBar: true },
  { href: "/inventory", labelKey: "nav.inventory", icon: Package, onTabBar: true },
  { href: "/giveaway", labelKey: "nav.giveaway", icon: Gift },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Count({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <span
      data-numeric
      className="grid min-w-5 place-items-center rounded-pill bg-tone-danger-solid px-1.5 text-meta font-semibold text-white"
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
  const t = useTranslations();
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
  /* A room owns the bottom edge — its composer sits there. The chat list is a
     list like any other and keeps the bar. */
  const isChatRoom = pathname.startsWith("/chat/");
  const showTabBar = !isChatRoom;

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
            href="/"
            aria-label={t("nav.brand")}
            className="group flex shrink-0 items-center gap-2.5 rounded-control outline-none"
          >
            <span className="grid size-10 place-items-center overflow-hidden rounded-control bg-white shadow-flat">
              <Image
                src="/images/ku-logo.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-auto object-contain"
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
                  <Count value={badge ? badges[badge] : undefined} />
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
            <LocaleSwitch className="hidden sm:flex" />

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
              className={cn(
                "touch-target grid size-10 place-items-center rounded-pill transition-colors",
                isActive(pathname, "/account")
                  ? "bg-brand text-on-brand"
                  : "bg-brand-subtle text-ink-brand hover:bg-[var(--brand-subtle-hover)]",
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
                  <li key={href} className="flex-1">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1",
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
                        <Count value={badge ? badges[badge] : undefined} />
                      </span>
                      <span className="text-meta leading-none">{t(labelKey)}</span>
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
  user?: { name: string };
  onNavigate: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="flex h-full flex-col gap-3">
      {/* The header switch is hidden below sm:, so the drawer carries it on a
          phone — where most of this product is read. */}
      <LocaleSwitch className="w-fit sm:hidden" />

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
              <span className="ml-auto">
                <Count value={count} />
              </span>
              {count ? (
                <span className="sr-only">{t("nav.needsYou", { count })}</span>
              ) : null}
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
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-pill bg-brand-subtle text-meta font-semibold text-ink-brand"
          >
            {user?.name?.slice(0, 2) ?? "?"}
          </span>
          {user?.name ?? "Account"}
        </Link>
      </div>
    </div>
  );
}
