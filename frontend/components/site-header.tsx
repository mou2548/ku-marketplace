"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";

import { MobileNav } from "@/components/mobile-nav";
import { NotificationBell } from "@/components/notification-bell";

const NAV_LINKS = [
  { label: "Home", href: "/marketplace" },
  { label: "Giveaway", href: "/giveaway" },
  { label: "Inventory", href: "/inventory" },
  { label: "Offers", href: "/offers" },
  { label: "Messages", href: "/chat" },
  { label: "History", href: "/history" },
] as const;

// A nav item stays highlighted on its sub-routes (/inventory/add, /giveaway/[itemId], ...).
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const active = NAV_LINKS.find((link) => isActive(pathname, link.href))?.href;
  const accountActive = isActive(pathname, "/account");

  return (
    // z-50: card-level overlays (e.g. the wishlist heart) use z-10 and would
    // otherwise paint over the sticky header — neither creates a stacking context.
    // Opaque on purpose: bg-white/80 + backdrop-blur let scrolled content ghost
    // through the bar. Solid white + a hairline border reads cleanly instead.
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between gap-4 border-b border-border/40 bg-white px-4 md:px-10">
      <div className="flex items-center gap-2">
        <MobileNav links={NAV_LINKS} active={active} />
        <Link href="/marketplace" className="text-base font-bold text-primary-dark">
          KU Marketplace
        </Link>
      </div>

      <nav className="hidden items-center gap-8 md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.href === active ? "page" : undefined}
            className={
              link.href === active
                ? "flex items-center justify-center rounded-lg border-b-2 border-primary-dark px-3 py-2 text-base font-medium text-primary-dark"
                : "flex items-center rounded-lg px-3 py-2 text-base text-muted-foreground hover:bg-surface-muted"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2 md:gap-4">
        <NotificationBell />
        <Link
          href="/account"
          aria-label="Account"
          aria-current={accountActive ? "page" : undefined}
          className={
            accountActive
              ? "flex size-8 items-center justify-center rounded-full bg-primary-light text-primary-dark"
              : "flex size-8 items-center justify-center rounded-full text-primary-dark hover:bg-surface-muted"
          }
        >
          <User className="size-4" />
        </Link>
      </div>
    </header>
  );
}
