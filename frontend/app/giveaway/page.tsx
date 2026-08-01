import Image from "next/image";
import Link from "next/link";
import { Gift, Search } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GIVEAWAY_ITEMS, GIVEAWAY_REQUEST_TYPE_META } from "@/lib/giveaway-items";

const TYPE_CLASS: Record<string, string> = {
  "first-come": "bg-[#FFBE3B]/20 text-[#6F4E00]",
  random: "bg-[#FFB2BA]/30 text-[#7C2A39]",
  manual: "bg-primary-light text-primary-dark",
};

export default function GiveawayPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center bg-page-background px-0 pt-8 pb-12">
        <section className="bg-grid-texture flex w-full max-w-[1200px] flex-col gap-2 rounded-[32px] px-6 py-10">
          <h1 className="text-4xl leading-[1.15] font-bold tracking-[-0.02em] text-primary-dark sm:text-5xl">
            Giveaway Items
          </h1>
          <p className="max-w-[672px] text-lg text-[#64748B]">
            Find items shared by the KU community. Connect with peers and
            give items a second life through our curated giveaway program.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#0A0A0A]" />
              <Input
                type="search"
                placeholder="find something . . ."
                className="h-11 rounded-full border-border pr-9"
              />
            </div>
            {/* posting is the primary action here — History drops to secondary */}
            <Link
              href="/giveaway/new"
              className={cn(buttonVariants(), "h-12 gap-2 px-6 text-base whitespace-nowrap")}
            >
              <Gift className="size-4" />
              โพสต์แจกของ
            </Link>
            <Link
              href="/history"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 bg-white px-6 text-base whitespace-nowrap"
              )}
            >
              History
            </Link>
          </div>
        </section>

        <section className="grid w-full max-w-[1200px] grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {GIVEAWAY_ITEMS.map((item) => {
            const typeMeta = GIVEAWAY_REQUEST_TYPE_META[item.requestType];
            return (
              <article
                key={item.id}
                className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card"
              >
                <div className="relative h-[276px] w-full bg-[#E5E7EB]">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                  <div className="flex flex-col gap-2">
                    <Badge
                      className={cn(
                        "h-auto w-fit px-3 py-1",
                        TYPE_CLASS[item.requestType]
                      )}
                    >
                      {typeMeta.label}
                    </Badge>
                    <h3 className="line-clamp-2 min-h-[56px] text-lg text-foreground">
                      {item.name}
                    </h3>
                  </div>
                  <Link
                    href={`/giveaway/${item.id}`}
                    className={cn(buttonVariants(), "h-12 w-full text-base")}
                  >
                    Request Item
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
