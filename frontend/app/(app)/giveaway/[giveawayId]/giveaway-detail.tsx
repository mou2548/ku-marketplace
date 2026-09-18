"use client";

import { formatDate } from "@/lib/date-format";


import { getCopy } from "@/lib/copy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Clock, Dices, Gift, MapPin, Sparkles, Users } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { Notice } from "@/components/patterns/notice";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import { ProductGallery } from "@/components/market/product-gallery";
import { useStatusText } from "@/lib/status-text";
import { drawGiveaway, joinGiveaway } from "@/lib/actions/giveaways";
import type { ApiError } from "@/lib/api/client";
import type { GiveawayPost, GiveawayTicket } from "@/lib/api/types";
import { ALLOCATION_METHOD, GIVEAWAY_STATUS, TICKET_STATUS, type Deadline } from "@/lib/status";
import { UNKNOWN_TIME, useNow } from "@/lib/use-now";

/**
 * Research risk R7: registering and then waiting had no shape at all in the
 * old UI — a student pressed a button and then refreshed a page hoping.
 *
 * So the waiting state is a real state on this screen, with the draw time as a
 * countdown and the method restated. "You will find out at 18:00 on Friday, by
 * random draw" is a completely different experience from a silent list row.
 */
export function GiveawayDetail({
  giveaway,
  ticket,
  isGiver,
}: {
  giveaway: GiveawayPost;
  ticket?: GiveawayTicket;
  isGiver: boolean;
}) {
  const t = getCopy();
  const st = useStatusText();
  const router = useRouter();
  const toast = useToast();
  const [joinedStatus, setJoinedStatus] = useState(ticket?.status);
  const [busy, setBusy] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const method = ALLOCATION_METHOD[giveaway.allocation_method];

  const now = useNow(30_000);
  const known = now !== UNKNOWN_TIME;
  const registerStartMs = giveaway.register_start
    ? Date.parse(giveaway.register_start)
    : null;
  const registerEndMs = giveaway.register_deadline
    ? Date.parse(giveaway.register_deadline)
    : null;
  const pickupStartMs = giveaway.pickup_start
    ? Date.parse(giveaway.pickup_start)
    : null;
  const pickupEndMs = giveaway.pickup_deadline
    ? Date.parse(giveaway.pickup_deadline)
    : null;

  // Before registration opens, count down to opening; once open, count down
  // to the draw/close instead.
  let drawDeadline: Deadline | undefined;
  if (known && registerStartMs && now < registerStartMs) {
    drawDeadline = {
      kind: "giveaway-registration",
      expiresAt: registerStartMs,
      labelKey: "deadline.registration-opens.label",
      onExpiry: "forfeit",
    };
  } else if (registerEndMs) {
    drawDeadline = {
      kind: "giveaway-registration",
      expiresAt: registerEndMs,
      labelKey: "deadline.draw.label",
      onExpiry: "forfeit",
    };
  }

  let pickupCountdown: Deadline | undefined;
  if (known && pickupStartMs && now < pickupStartMs) {
    pickupCountdown = {
      kind: "giveaway-pickup",
      expiresAt: pickupStartMs,
      labelKey: "deadline.pickup-opens.label",
      onExpiry: "forfeit",
    };
  } else if (pickupEndMs) {
    pickupCountdown = {
      kind: "giveaway-pickup",
      expiresAt: pickupEndMs,
      labelKey: "deadline.pickup-closes.label",
      onExpiry: "forfeit",
    };
  }

  const pickupBy = giveaway.pickup_deadline
    ? formatDate(new Date(giveaway.pickup_deadline))
    : null;

  async function join() {
    setBusy(true);
    try {
      const joined = await joinGiveaway(giveaway.giveaway_id);
      setJoinedStatus(joined.status);
      toast.success(
        joined.status === "Waiting"
          ? "Your place is confirmed. Open your ticket when you collect."
          : "Registered. Wait for the result.",
      );
      router.refresh();
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not register. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function runDraw() {
    setDrawing(true);
    try {
      const recipients = await drawGiveaway(giveaway.giveaway_id);
      toast.success(
        recipients.length > 0
          ? "Draw complete. The winner has been notified."
          : "Draw complete.",
      );
      router.refresh();
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not run the draw.");
    } finally {
      setDrawing(false);
    }
  }

  const participationAction = isGiver ? (
    /* Only a Manual giveaway has anything for its giver to do. FirstCome
       allocates as people register and Random is drawn by the system. */
    giveaway.allocation_method === "Manual" ? (
      <LinkButton
        size="lg"
        block
        href={`/giveaway/${giveaway.giveaway_id}/manage`}
      >
        <Users className="size-5" />
        Choose recipients
      </LinkButton>
    ) : giveaway.allocation_method === "Random" ? (
      giveaway.status === "Active" ? (
        <div className="flex flex-col gap-2">
          <Button size="lg" block isLoading={drawing} onPress={runDraw}>
            <Dices className="size-5" />
            Run the draw
          </Button>
          <p className="text-caption leading-[1.6] text-ink-secondary">
            Selects up to {giveaway.quantity} recipients and closes
            registration. If registrations do not exceed that number, everyone
            receives a place.
          </p>
        </div>
      ) : (
        <Notice tone="success">
          <p className="text-body font-medium text-tone-success-fg">
            The draw has run. A chat room is open with the winner.
          </p>
        </Notice>
      )
    ) : (
      <Notice tone="success">
        <p className="text-body font-medium text-tone-success-fg">
          This is your giveaway. Nothing for you to do.
        </p>
        <p className="mt-1 text-caption leading-[1.6] text-ink-secondary">
          {st.of(method).hint}. A chat room opens with each entrant as they
          register so you can arrange collection.
        </p>
      </Notice>
    )
  ) : ticket ? (
    <div className="flex flex-col gap-2">
      <StatusBadge status={TICKET_STATUS[ticket.status]} />
      <LinkButton
        size="lg"
        block
        href={`/giveaway/${giveaway.giveaway_id}/ticket/${ticket.ticket_id}`}
      >
        Open my ticket
      </LinkButton>
    </div>
  ) : joinedStatus ? (
    <Notice tone="success">
      <p className="text-body font-medium text-tone-success-fg">
        {joinedStatus === "Waiting"
          ? "Your place is confirmed."
          : "Registered. Waiting for the result."}
      </p>
      <p className="mt-1 text-caption leading-[1.6] text-ink-secondary">
        {joinedStatus === "Waiting"
          ? "First come, first served confirms your place immediately. Open this page again to show your collection QR."
          : "If you are selected, a chat room opens and a QR ticket is issued automatically. You do not need to watch this page."}
      </p>
    </Notice>
  ) : giveaway.registration_open ? (
    <Button size="lg" block isLoading={busy} onPress={join}>
      <Gift className="size-5" />
      Register for this giveaway
    </Button>
  ) : known && registerStartMs && now < registerStartMs && giveaway.status === "Active" ? (
    // Not open yet, not closed — the browse list now surfaces this giveaway
    // before its window starts (like a concert listing showing "on sale
    // Friday") specifically so a receiver knows to come back, so the CTA
    // must not read as "closed".
    <Surface shape="card" elevation="flat" className="bg-surface-sunken p-4">
      <StatusBadge status={GIVEAWAY_STATUS[giveaway.status]} size="sm" />
      <p className="mt-2 text-caption leading-[1.6] text-ink-secondary">
        Registration has not opened yet. Come back when it opens.
      </p>
    </Surface>
  ) : (
    <Surface shape="card" elevation="flat" className="bg-surface-sunken p-4">
      <StatusBadge status={GIVEAWAY_STATUS[giveaway.status]} size="sm" />
      <p className="mt-2 text-caption leading-[1.6] text-ink-secondary">
        Registration for this giveaway has closed.
      </p>
    </Surface>
  );

  return (
    <div className="flex flex-col gap-7 pb-6">
      <Link
        href="/giveaway"
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-secondary hover:text-ink-brand"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("giveaway.back")}
      </Link>

      <section className="grid min-w-0 gap-7 md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] md:items-start xl:grid-cols-[minmax(0,1.08fr)_minmax(17rem,.78fr)_20rem] xl:gap-8">
        <ProductGallery images={giveaway.images} name={giveaway.item_name} />

        <div className="flex min-w-0 flex-col gap-6 md:pt-2">
          <header className="flex flex-col gap-3">
            <p className="text-overline font-semibold text-tone-warning-fg uppercase">
              {t("giveaway.freeFromCommunity")}
            </p>
            <StatusBadge status={method} size="sm" className="w-fit" />
            <h1 className="text-display text-balance">{giveaway.item_name}</h1>
          </header>

          <div className="xl:hidden">{participationAction}</div>

          {giveaway.description ? (
            <div>
              <h2 className="mb-2 text-h3">{t("giveaway.about")}</h2>
              <p className="max-w-prose text-body whitespace-pre-line text-ink-secondary">
                {giveaway.description}
              </p>
            </div>
          ) : null}

          {/* How you will find out, stated before you commit. */}
          <Notice tone={method.tone} className="flex flex-col gap-2">
            <p className="text-body-sm font-semibold">
              {st.of(method).label}
            </p>
            <p className="text-caption leading-[1.6] text-ink-secondary">
              {st.of(method).hint}
            </p>
            {drawDeadline ? (
              <CountdownPill deadline={drawDeadline} showLabel />
            ) : null}
          </Notice>
          {giveaway.all_registered_guaranteed ? (
            <Notice tone="success">
              <p className="text-body-sm font-medium text-tone-success-fg">
                Registration has closed with no more than {giveaway.quantity}{" "}
                entrant{giveaway.quantity === 1 ? "" : "s"}. Everyone registered
                receives a place; no random elimination is needed.
              </p>
            </Notice>
          ) : null}
        </div>

        <aside className="min-w-0 md:col-span-2 xl:col-span-1 xl:sticky xl:top-24">
          <Surface shape="panel" className="overflow-hidden">
            <div aria-hidden className="h-1 bg-tone-warning-solid" />
            <div className="flex flex-col gap-4 p-5">
              <div>
                <p className="mb-3 text-overline text-ink-muted uppercase">
                  {t("giveaway.giver")}
                </p>
                <TrustBadge
                  name={giveaway.giver.name}
                  isVerified={giveaway.giver.isVerified}
                  faculty={giveaway.giver.faculty}
                  year={giveaway.giver.year}
                  avatarUrl={giveaway.giver.avatar_url}
                />
              </div>

              <div className="h-px bg-line" />

              <p className="flex items-start gap-2 text-body-sm text-ink-secondary">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-tone-warning-fg" />
                {giveaway.pickup_location}
              </p>
              {pickupBy ? (
                <p className="flex items-center gap-2 text-body-sm text-ink-secondary">
                  <Clock aria-hidden className="size-4 shrink-0 text-tone-warning-fg" />
                  {t("giveaway.collectBy", { date: pickupBy })}
                </p>
              ) : null}
              {pickupCountdown ? (
                <CountdownPill deadline={pickupCountdown} showLabel />
              ) : null}
              <p
                data-numeric
                className="flex flex-wrap items-center gap-1.5 text-body-sm text-ink-muted"
              >
                <Users aria-hidden className="size-4 shrink-0" />
                {giveaway.registered_count} registered
                <span aria-hidden className="text-ink-disabled">
                  ·
                </span>
                {giveaway.quantity} recipient {giveaway.quantity === 1 ? "place" : "places"}
              </p>
              {giveaway.allocation_method === "FirstCome" ? (
                <p data-numeric className="text-caption text-ink-secondary">
                  {giveaway.remaining_slots > 0
                    ? `${giveaway.remaining_slots} place${giveaway.remaining_slots === 1 ? "" : "s"} left`
                    : "All places have been allocated"}
                </p>
              ) : null}

              <div className="hidden xl:block">
                <div className="mb-4 h-px bg-line" />
                {participationAction}
              </div>
            </div>
            <div className="flex items-start gap-2 bg-tone-warning-bg px-5 py-3 text-meta text-tone-warning-fg">
              <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{t("giveaway.freeNote")}</span>
            </div>
          </Surface>
        </aside>
      </section>
    </div>
  );
}
