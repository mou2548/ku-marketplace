"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Gift, MapPin, Plus, Users } from "lucide-react";

import { LinkButton } from "@/components/kit/button";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { EmptyState } from "@/components/kit/empty-state";
import { StatusIcon } from "@/components/kit/icon";
import { MasonryGrid, MasonryItem } from "@/components/kit/masonry-grid";
import { PostImage } from "@/components/kit/post-image";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TabCount, TabList, TabPanel, Tabs, UnderlineTab } from "@/components/kit/tabs";
import { TrustBadge } from "@/components/kit/trust-badge";
import { TONE_CHIP } from "@/components/kit/tone";
import { useStatusText } from "@/lib/i18n/status-text";
import type { GiveawayPost, GiveawayTicket } from "@/lib/api/types";
import { ALLOCATION_METHOD, TICKET_STATUS, type Deadline } from "@/lib/status";
import { UNKNOWN_TIME, useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

export function GiveawayBrowser({
  giveaways,
  tickets,
}: {
  giveaways: GiveawayPost[];
  tickets: GiveawayTicket[];
}) {
  const t = useTranslations();
  // "Open" has to mean open. Closed and Completed rows are still reachable
  // from a ticket or a chat room; they are not something to browse and enter.
  const open = giveaways.filter((g) => g.registration_open);

  return (
    <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-5">
      <header className="flex flex-col gap-4 px-1 pt-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <p className="text-overline font-semibold text-tone-warning-fg uppercase">
            {t("giveaway.communityShelf")}
          </p>
          <h1 className="mt-1 text-h1 text-balance">{t("giveaway.title")}</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-ink-muted">
            {t("giveaway.subtitle")}
          </p>
        </div>
        <LinkButton size="sm" href="/post?type=giveaway">
          <Plus className="size-4" />
          {t("giveaway.create")}
        </LinkButton>
      </header>

      <Tabs defaultSelectedKey="open">
        <TabList aria-label={t("giveaway.title")} variant="underline">
          <UnderlineTab id="open">
            {t("giveaway.open")}
            <TabCount>{open.length}</TabCount>
          </UnderlineTab>
          <UnderlineTab id="mine">
            {t("giveaway.myEntries")}
            <TabCount>{tickets.length}</TabCount>
          </UnderlineTab>
        </TabList>

        <TabPanel id="open">
          {open.length === 0 ? (
            <EmptyState
              icon={<Gift className="size-6" />}
              title={t("giveaway.emptyOpenTitle")}
              description={t("giveaway.emptyOpenBody")}
            />
          ) : (
            <MasonryGrid
              columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
              className="pt-1"
            >
              {open.map((g) => (
                <MasonryItem key={g.giveaway_id}>
                  <GiveawayCard giveaway={g} />
                </MasonryItem>
              ))}
            </MasonryGrid>
          )}
        </TabPanel>

        <TabPanel id="mine">
          {tickets.length === 0 ? (
            <EmptyState
              icon={<Gift className="size-6" />}
              title={t("giveaway.emptyMineTitle")}
              description={t("giveaway.emptyMineBody")}
            />
          ) : (
            <ul className="flex flex-col gap-2 pt-4">
              {tickets.map((ticket) => (
                <li key={ticket.ticket_id}>
                  <Link
                    href={`/giveaway/${ticket.giveaway_id}/ticket/${ticket.ticket_id}`}
                  >
                    <Surface as="div" shape="card" interactive className="flex items-center gap-3 overflow-hidden p-3">
                      <span className="block w-16 shrink-0 overflow-hidden rounded-slot">
                        <PostImage
                          src={ticket.giveaway.images[0]?.image_url}
                          alt=""
                          aspectRatio={1}
                          sizes="64px"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold">
                            {ticket.giveaway.item_name}
                          </p>
                          <span
                            data-numeric
                            className="shrink-0 text-meta text-ink-muted"
                          >
                            {t("giveaway.queueNumber", {
                              number: ticket.queue_number,
                            })}
                          </span>
                        </div>
                        <p className="truncate text-caption text-ink-muted">
                          {t("giveaway.collectAt", {
                            location: ticket.giveaway.pickup_location,
                          })}
                        </p>
                        <StatusBadge
                          status={TICKET_STATUS[ticket.status]}
                          size="sm"
                          className="mt-2 w-fit max-w-full sm:hidden"
                        />
                      </div>
                      <StatusBadge
                        status={TICKET_STATUS[ticket.status]}
                        size="sm"
                        className="hidden shrink-0 sm:inline-flex"
                      />
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
  const t = useTranslations();
  const st = useStatusText();
  const method = ALLOCATION_METHOD[giveaway.allocation_method];
  const image = giveaway.images[0]?.image_url;

  const now = useNow(30_000);
  const known = now !== UNKNOWN_TIME;
  const registerStartMs = giveaway.register_start
    ? Date.parse(giveaway.register_start)
    : null;
  const registerEndMs = giveaway.register_deadline
    ? Date.parse(giveaway.register_deadline)
    : null;

  // Before it opens, count down to opening; once open, count down to close.
  let registrationCountdown: { deadline: Deadline; expiredLabel: string } | null =
    null;
  if (known && registerStartMs && now < registerStartMs) {
    registrationCountdown = {
      deadline: {
        kind: "giveaway-registration",
        expiresAt: registerStartMs,
        labelKey: "deadline.registration-opens.label",
        onExpiry: "forfeit",
      },
      expiredLabel: "Registration open",
    };
  } else if (registerEndMs) {
    registrationCountdown = {
      deadline: {
        kind: "giveaway-registration",
        expiresAt: registerEndMs,
        labelKey: "deadline.registration-closes.label",
        onExpiry: "forfeit",
      },
      expiredLabel: "Registration closed",
    };
  }

  return (
    <article className="group/drop break-inside-avoid">
      <Link
        href={`/giveaway/${giveaway.giveaway_id}`}
        className="block rounded-card outline-none"
      >
        <div className="relative overflow-hidden rounded-card bg-surface-sunken shadow-flat transition-[transform,box-shadow] duration-[--dur-base] ease-[--ease-out] group-hover/drop:-translate-y-0.5 group-hover/drop:shadow-floating group-focus-visible/drop:shadow-floating">
          <PostImage
            src={image}
            alt={giveaway.item_name}
            aspectRatio={1.35}
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 25vw"
            className="transition-transform duration-[--dur-slow] ease-[--ease-out] group-hover/drop:scale-[1.025]"
          />
          <span
            title={st.of(method).hint}
            className={cn(
              "absolute top-2 left-2 inline-flex items-center gap-1 rounded-pill border px-2 py-1 text-meta font-semibold whitespace-nowrap",
              TONE_CHIP[method.tone],
            )}
          >
            <StatusIcon name={method.icon} className="size-3.5" />
            {t(`giveaway.method${giveaway.allocation_method}`)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 px-1 pt-2.5 pb-1">
          <h3 className="line-clamp-2 text-[0.9375rem] leading-[1.45] font-semibold">
            {giveaway.item_name}
          </h3>

          {/* R7: the method is explained on the card, before registering —
              "random" and "first come" mean very different things to someone
              deciding whether to bother. */}
          <p className="line-clamp-2 text-caption leading-[1.6] text-ink-muted">
            {st.of(method).hint}
          </p>

          <p className="flex items-start gap-1.5 text-caption text-ink-muted">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            {giveaway.pickup_location}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            {registrationCountdown ? (
              <CountdownPill
                deadline={registrationCountdown.deadline}
                expiredLabel={registrationCountdown.expiredLabel}
              />
            ) : null}
            <span
              data-numeric
              className="flex items-center gap-1.5 text-caption font-medium text-ink-secondary"
            >
              <Users aria-hidden className="size-3.5" />
              {giveaway.registered_count} registered
              <span aria-hidden className="text-ink-disabled">·</span>
              {giveaway.quantity} recipient {giveaway.quantity === 1 ? "place" : "places"}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={`${giveaway.registered_count} registered for ${giveaway.quantity} recipient places`}
            aria-valuemin={0}
            aria-valuemax={giveaway.quantity}
            aria-valuenow={Math.min(
              giveaway.registered_count,
              giveaway.quantity,
            )}
            className="h-1.5 overflow-hidden rounded-pill bg-surface-sunken"
          >
            <span
              aria-hidden
              className="block h-full rounded-pill bg-brand"
              style={{
                width: `${Math.min(
                  (giveaway.registered_count / giveaway.quantity) * 100,
                  100,
                )}%`,
              }}
            />
          </div>

          <TrustBadge
            name={giveaway.giver.name}
            isVerified={giveaway.giver.isVerified}
            size="sm"
          />
        </div>
      </Link>
    </article>
  );
}
