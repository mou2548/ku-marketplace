"use client";

import { getCopy } from "@/lib/copy";
import Link from "next/link";
import { Gift, MapPin, Plus, ScanLine, Users } from "lucide-react";

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
import { useStatusText } from "@/lib/status-text";
import type { GiveawayPost, GiveawayTicket } from "@/lib/api/types";
import { ALLOCATION_METHOD, TICKET_STATUS, type Deadline } from "@/lib/status";
import { UNKNOWN_TIME, useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/**
 * Whether a giveaway belongs on the public shelf at all — open for
 * registration right now, or still to come. Mirrors the backend's
 * `registration_open` conditions (`giveaways.service.ts`'s `serializeGiveaway`)
 * except it drops the `registerStart <= now` check: a future registration
 * window is exactly what a browsing receiver needs to see, the same way a
 * concert listing shows "on sale Friday 10:00" rather than hiding the show
 * until sales open. `GiveawayCard` already renders the "opens in" countdown
 * for that case; only the parent's filter was hiding the card from it.
 */
function isBrowsable(g: GiveawayPost, now: number): boolean {
  if (g.status !== "Active") return false;
  const deadline = g.register_deadline ? Date.parse(g.register_deadline) : null;
  if (deadline !== null && deadline <= now) return false;
  if (g.allocation_method === "FirstCome" && g.remaining_slots <= 0) return false;
  return true;
}

export function GiveawayBrowser({
  giveaways,
  tickets,
  viewerId,
}: {
  giveaways: GiveawayPost[];
  tickets: GiveawayTicket[];
  viewerId: number | null;
}) {
  const t = getCopy();
  const now = useNow(30_000);
  const known = now !== UNKNOWN_TIME;
  // "Open" has to mean open or upcoming. Closed and Completed rows are still
  // reachable from a ticket or a chat room; they are not something to browse
  // and enter. Before the clock is known (server render), fall back to the
  // backend's own flag so the first paint and the hydrated one agree.
  const open = giveaways.filter((g) => (known ? isBrowsable(g, now) : g.registration_open));
  // Everything the viewer gave away, whatever its state: a giveaway leaves
  // the open shelf when registration closes, and the giver still has work to
  // do (choose recipients, scan tickets) or wants the record.
  const given = viewerId
    ? giveaways.filter((g) => g.giver_id === viewerId)
    : [];

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
        <div className="flex items-center gap-2">
          <LinkButton size="sm" variant="secondary" href="/giveaway/scan">
            <ScanLine className="size-4" />
            Scan a ticket
          </LinkButton>

          <LinkButton size="sm" href="/post?type=giveaway">
            <Plus className="size-4" />
            {t("giveaway.create")}
          </LinkButton>
        </div>
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
          {viewerId ? (
            <UnderlineTab id="given">
              My giveaways
              <TabCount>{given.length}</TabCount>
            </UnderlineTab>
          ) : null}
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

        {viewerId ? (
          <TabPanel id="given">
            {given.length === 0 ? (
              <EmptyState
                icon={<Gift className="size-6" />}
                title="You have not given anything away yet"
                description="Giveaways you create stay here after registration closes, with what is left to do."
              />
            ) : (
              <ul className="flex flex-col gap-2 pt-4">
                {given.map((giveaway) => {
                  const stage = giverStage(giveaway, known ? now : null);
                  return (
                    <li key={giveaway.giveaway_id}>
                      <Link href={`/giveaway/${giveaway.giveaway_id}/manage`}>
                        <Surface
                          as="div"
                          shape="card"
                          interactive
                          className="flex items-center gap-3 overflow-hidden p-3"
                        >
                          <span className="block w-16 shrink-0 overflow-hidden rounded-slot">
                            <PostImage
                              src={giveaway.images[0]?.image_url}
                              alt=""
                              aspectRatio={1}
                              sizes="64px"
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">
                              {giveaway.item_name}
                            </p>
                            <p className="truncate text-caption text-ink-muted">
                              {giveaway.registered_count} registered ·{" "}
                              {giveaway.quantity} to give
                            </p>
                            {stage.todo ? (
                              <p className="mt-1 text-caption font-medium text-tone-warning-fg">
                                {stage.todo}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-pill border px-2.5 py-0.5 text-meta font-medium",
                              TONE_CHIP[stage.tone],
                            )}
                          >
                            {stage.label}
                          </span>
                        </Surface>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabPanel>
        ) : null}
      </Tabs>
    </div>
  );
}

/**
 * Where a giveaway stands for its giver, in the flow's terms: open for
 * registration, then allocation (automatic for First come and Random, the
 * giver's job for Manual), then pickup.
 */
function giverStage(
  g: GiveawayPost,
  now: number | null,
): { label: string; tone: "neutral" | "info" | "success" | "warning"; todo?: string } {
  if (g.status === "Completed") return { label: "Finished", tone: "neutral" };
  if (g.status === "Closed")
    return {
      label: "Pickup",
      tone: "info",
      todo: "Scan each recipient's ticket when they collect",
    };
  const closed =
    now !== null && g.register_deadline
      ? Date.parse(g.register_deadline) <= now
      : !g.registration_open;
  if (!closed) return { label: "Open", tone: "success" };
  if (g.allocation_method === "Manual")
    return {
      label: "Choose recipients",
      tone: "warning",
      todo: "Registration has closed: pick who receives it",
    };
  return { label: "Allocating", tone: "info" };
}

function GiveawayCard({ giveaway }: { giveaway: GiveawayPost }) {
  const t = getCopy();
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
            alt={giveaway.item_name ?? ""}
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
              {giveaway.allocation_method === "FirstCome"
                ? `${giveaway.quantity} ${giveaway.quantity === 1 ? "spot" : "spots"} total`
                : `${giveaway.quantity} to be given away`}
            </span>
          </div>

          {/* A registration cap only exists for FirstCome — Random and
              Manual accept any number of entrants and choose this many when
              registration closes, so "progress toward full" isn't a real
              state for them and the bar would misreport "full" while
              registration is still open. */}
          {giveaway.allocation_method === "FirstCome" ? (
            <div
              role="progressbar"
              aria-label={`${giveaway.registered_count} registered out of ${giveaway.quantity} spots total`}
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
          ) : null}

          <TrustBadge
            name={giveaway.giver.name}
            avatarUrl={giveaway.giver.avatar_url}
            isVerified={giveaway.giver.isVerified}
            size="sm"
          />
        </div>
      </Link>
    </article>
  );
}
