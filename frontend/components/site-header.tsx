import Link from "next/link";
import { Bell, User } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Giveaway", href: "/giveaway" },
  { label: "Inventory", href: "/inventory" },
  { label: "Messages", href: "/chat" },
  { label: "History", href: "/trade" },
  { label: "Account", href: "/account" },
] as const;

export function SiteHeader({
  active,
}: {
  active?: (typeof NAV_LINKS)[number]["href"];
}) {
  return (
    <header className="sticky top-0 z-10 flex flex-col border-b border-border/30 bg-white/80 px-10 shadow-card backdrop-blur-[10px]">
      <div className="flex h-16 w-full items-center justify-between">
        <span className="text-base font-bold text-[#1D6D41]">
          KU Marketplace
        </span>

        <nav className="flex items-start gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.href === active
                  ? "flex items-center justify-center rounded-lg border-b-2 border-[#1D6D41] px-3 py-2 text-base font-medium text-[#1D6C41]"
                  : "flex items-center rounded-lg px-3 py-2 text-base text-muted-foreground hover:bg-[#F4F6F8]"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="flex size-8 items-center justify-center rounded-full text-[#1D6D41] hover:bg-[#F4F6F8]"
          >
            <Bell className="size-4" />
          </Link>
          <Link
            href="/account"
            aria-label="Account"
            className="flex size-8 items-center justify-center rounded-full text-[#1D6D41] hover:bg-[#F4F6F8]"
          >
            <User className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
