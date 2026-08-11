"use client";

import Image from "next/image";
import Link from "next/link";
import { Gift, MapPin, Plus, Users } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { EmptyState } from "@/components/kit/empty-state";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import {
  SegmentTab,
  TabList,
  TabPanel,
  Tabs,
} from "@/components/kit/tabs";
import { TrustBadge } from "@/components/kit/trust-badge";
import type { GiveawayPost, GiveawayTicket } from "@/lib/api/types";
import { ALLOCATION_METHOD, TICKET_STATUS } from "@/lib/status";

export function GiveawayBrowser({
  giveaways,
  tickets,
}: {
  giveaways: GiveawayPost[];
  tickets: GiveawayTicket[];
}) {
  // "Open" has to mean open. Closed and Completed rows are still reachable
  // from a ticket or a chat room; they are not something to browse and enter.
  const open = giveaways.filter((g) => g.status === "Active");

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
          Giveaways
        </h1>
        <LinkButton size="sm" href="/post?type=giveaway">
          <Plus className="size-4" />
          Give something away
        </LinkButton>
      </header>

      <Tabs defaultSelectedKey="open">
        <TabList aria-label="Giveaways" variant="segment">
          <SegmentTab id="open">Open</SegmentTab>
          <SegmentTab id="mine">My entries</SegmentTab>
        </TabList>

        <TabPanel id="open">
          {open.length === 0 ? (
            <EmptyState
              icon={<Gift className="size-6" />}
              title="No one is giving anything away right now"
              description="Open giveaways appear here, each showing how recipients are chosen and when registration closes"
            />
          ) : (
            <ul className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {open.map((g) => (
                <li key={g.giveaway_id}>
                  <GiveawayCard giveaway={g} />
                </li>
              ))}
            </ul>
          )}
        </TabPanel>

        <TabPanel id="mine">
          {tickets.length === 0 ? (
            <EmptyState
              icon={<Gift className="size-6" />}
              title="You have not entered any giveaways"
              description="Register, then wait for the draw. If you are selected, a chat room opens and a QR ticket is issued."
            />
          ) : (
            <ul className="flex flex-col gap-2 pt-4">
              {tickets.map((t) => (
                <li key={t.ticket_id}>
                  <Link href={`/giveaway/ticket/${t.ticket_id}`}>
                    <Surface
                      as="div"
                      shape="card"
                      interactive
                      className="flex items-center gap-3 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {t.giveaway.item_name}
                        </p>
                        <p className="truncate text-[0.8125rem] text-ink-muted">
                          Collect at {t.giveaway.pickup_location}
                        </p>
                      </div>
                      <StatusBadge status={TICKET_STATUS[t.status]} size="sm" />
                    </Surface>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}

function GiveawayCard({ giveaway }: { giveaway: GiveawayPost }) {
  const method = ALLOCATION_METHOD[giveaway.allocation_method];
  const image = giveaway.images[0]?.image_url;

  return (
    <Link href={`/giveaway/${giveaway.giveaway_id}`}>
      <Surface as="article" shape="card" interactive className="overflow-hidden">
        <div className="relative aspect-[4/3] w-full bg-surface-sunken">
          {image ? (
            <Image
              src={image}
              alt={giveaway.item_name}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-ink-disabled">
              <Gift aria-hidden className="size-8" />
            </span>
          )}
          <span className="absolute top-2 left-2">
            <StatusBadge status={method} size="sm" />
          </span>
        </div>

        <div className="flex flex-col gap-2 p-4">
          <h3 className="font-semibold">{giveaway.item_name}</h3>

          {/* R7: the method is explained on the card, before registering —
              "random" and "first come" mean very different things to someone
              deciding whether to bother. */}
          <p className="text-[0.8125rem] leading-[1.6] text-ink-muted">
            {method.hint}
          </p>

          <p className="flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            {giveaway.pickup_location}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {giveaway.registered_deadline ? (
              <CountdownPill
                deadline={{
                  kind: "giveaway-pickup",
                  expiresAt: Date.parse(giveaway.registered_deadline),
                  label: "Registration closes",
                  onExpiry: "forfeit",
                }}
                expiredLabel="Registration closed"
              />
            ) : null}
            {giveaway.registered_count ? (
              <span
                data-numeric
                className="flex items-center gap-1 text-[0.75rem] text-ink-muted"
              >
                <Users aria-hidden className="size-3.5" />
                {giveaway.registered_count} registered
              </span>
            ) : null}
          </div>

          <TrustBadge
            name={giveaway.giver.name}
            isVerified={giveaway.giver.isVerified}
            size="sm"
          />
        </div>
      </Surface>
    </Link>
  );
}
