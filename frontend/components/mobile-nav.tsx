"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavLink {
  label: string;
  href: string;
}

export function MobileNav({
  links,
  active,
}: {
  links: readonly NavLink[];
  active?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="text-primary-dark md:hidden"
      >
        <Menu className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-full gap-0 sm:max-w-[280px]">
          <SheetHeader className="border-b border-border/20 p-6">
            <SheetTitle className="text-lg text-primary-dark">
              KU Marketplace
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-1 p-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-3 text-base",
                  link.href === active
                    ? "bg-primary-light font-medium text-primary-dark"
                    : "text-muted-foreground hover:bg-surface-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
