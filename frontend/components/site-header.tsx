import Link from "next/link";
import { Bell, User } from "lucide-react";

import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "Home", href: "/marketplace", active: true },
  { label: "Giveaway", href: "#" },
  { label: "Inventory", href: "#" },
  { label: "Messages", href: "#" },
  { label: "History", href: "#" },
  { label: "Account", href: "#" },
];

export function SiteHeader() {
  return (
    <header className="flex w-full items-center justify-between px-8 py-4">
      <span className="text-lg font-bold" style={{ color: "#1D6D41" }}>
        KU Marketplace
      </span>

      <nav className="flex items-center gap-8">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={
              link.active
                ? "border-b-2 pb-1 text-sm font-medium"
                : "text-sm text-muted-foreground transition-colors hover:text-foreground"
            }
            style={
              link.active
                ? { color: "#1D6D41", borderColor: "#1D6D41" }
                : undefined
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-5" style={{ color: "#1D6D41" }} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Account">
          <User className="size-5" style={{ color: "#1D6D41" }} />
        </Button>
      </div>
    </header>
  );
}
