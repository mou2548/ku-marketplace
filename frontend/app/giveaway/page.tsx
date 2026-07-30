import Link from "next/link";
import { Search } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// TODO: replace with real giveaway items from the API
const ITEMS = [
  {
    name: "Minimal Mechanical Keyboard",
    type: "First-come, First-served",
    typeClass: "bg-[#FFBE3B]/20 text-[#6F4E00]",
    cta: "Request Item",
    href: "/giveaway/itemdetail3",
  },
  {
    name: "Architecture Reference Set",
    type: "Random Draw",
    typeClass: "bg-[#FFB2BA]/30 text-[#7C2A39]",
    cta: "Request Item",
    href: "/giveaway/itemdetail2",
  },
  {
    name: "Monstera Deliciosa Plant",
    type: "Manual Selection",
    typeClass: "bg-[#DAE2FD]/50 text-[#2E8F5A]",
    cta: "Request Item",
    href: "/giveaway/itemdetail",
  },
] as const;

export default function GiveawayPage() {
  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(0deg,#F4F6F8,#F4F6F8)] bg-white">
      <SiteHeader active="/giveaway" />

      <main className="flex flex-1 flex-col items-center bg-[#F4F6F8] px-0 pt-8 pb-12">
        <section className="bg-grid-texture flex w-full max-w-[1200px] flex-col gap-2 rounded-[32px] px-6 py-10">
          <h1 className="text-[40px] leading-[1.1] font-extrabold tracking-[-0.02em] text-foreground sm:text-[56px]">
            Giveaway
            <br />
            <span className="text-[#2E8F5A]">Items</span>
          </h1>
          <p className="max-w-[672px] text-lg text-[#64748B]">
            Find items shared by the KU community. Connect with peers and
            give items a second life through our curated giveaway program.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <div className="relative max-w-[804px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#0A0A0A]" />
              <Input
                type="search"
                placeholder="find something . . ."
                className="h-11 rounded-full border-border pr-9"
              />
            </div>
            <Link
              href="/giveaway/manager"
              className={cn(buttonVariants(), "h-12 px-8 text-base")}
            >
              History
            </Link>
          </div>
        </section>

        <section className="grid w-full max-w-[1200px] grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <article
              key={item.name}
              className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card"
            >
              <div className="h-[276px] w-full animate-pulse bg-[#E5E7EB]" />
              <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                <div className="flex flex-col gap-2">
                  <Badge className={cn("h-auto w-fit px-3 py-1", item.typeClass)}>
                    {item.type}
                  </Badge>
                  <h3 className="line-clamp-2 min-h-[56px] text-lg text-foreground">
                    {item.name}
                  </h3>
                </div>
                <Link
                  href={item.href}
                  className={cn(buttonVariants(), "h-12 w-full text-base")}
                >
                  {item.cta}
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
