"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Clock, Dices, Gift, MapPin, Users } from "lucide-react";

import { Button, LinkButton } from "@/components/kit/button";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import { drawGiveaway, joinGiveaway } from "@/lib/actions/giveaways";
import type { ApiError } from "@/lib/api/client";
import type { GiveawayPost, GiveawayTicket } from "@/lib/api/types";
import { ALLOCATION_METHOD, GIVEAWAY_STATUS, TICKET_STATUS } from "@/lib/status";

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
  const router = useRouter();
  const toast = useToast();
  const [joined, setJoined] = useState(!!ticket);
  const [busy, setBusy] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const method = ALLOCATION_METHOD[giveaway.allocation_method];
  const image = giveaway.images[0]?.image_url;

  // The backend has one deadline field, not a separate signup window and
  // pickup window (docs/design/api-gaps.md §8) — it stands in for both here.
  const drawDeadline = giveaway.registered_deadline
    ? {
        kind: "giveaway-pickup" as const,
        expiresAt: Date.parse(giveaway.registered_deadline),
        label: "Draw",
        onExpiry: "forfeit" as const,
      }
    : undefined;

  const pickupBy = giveaway.registered_deadline
    ? new Date(giveaway.registered_deadline).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : null;

  async function join() {
    setBusy(true);
    try {
      await joinGiveaway(giveaway.giveaway_id);
      setJoined(true);
      toast.show("Registered. Wait for the draw.");
      router.refresh();
    } catch (error) {
      toast.show((error as ApiError).message ?? "Could not register. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function runDraw() {
    setDrawing(true);
    try {
      const recipients = await drawGiveaway(giveaway.giveaway_id);
      toast.show(
        recipients.length > 0
          ? "Draw complete. The winner has been notified."
          : "Draw complete.",
      );
      router.refresh();
    } catch (error) {
      toast.show((error as ApiError).message ?? "Could not run the draw.");
    } finally {
      setDrawing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <div className="lg:w-1/2">
        <Surface shape="card" className="relative aspect-[4/3] overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={giveaway.item_name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center bg-surface-sunken text-ink-disabled">
              <Gift aria-hidden className="size-10" />
            </span>
          )}
        </Surface>
      </div>

      <div className="flex flex-col gap-5 lg:w-1/2">
        <div className="flex flex-col gap-2">
          <StatusBadge status={method} size="sm" className="w-fit" />
          <h1 className="text-display">
            {giveaway.item_name}
          </h1>
          {giveaway.description ? (
            <p className="text-body text-ink-secondary">
              {giveaway.description}
            </p>
          ) : null}
        </div>

        <Surface shape="card" className="flex flex-col gap-3 p-4">
          <TrustBadge
            name={giveaway.giver.name}
            isVerified={giveaway.giver.isVerified}
            faculty={giveaway.giver.faculty}
            year={giveaway.giver.year}
          />
          <p className="flex items-center gap-2 text-body">
            <MapPin aria-hidden className="size-4 shrink-0 text-ink-muted" />
            {giveaway.pickup_location}
          </p>
          {pickupBy ? (
            <p className="flex items-center gap-2 text-body">
              <Clock aria-hidden className="size-4 shrink-0 text-ink-muted" />
              Collect by {pickupBy}
            </p>
          ) : null}
          {giveaway.registered_count ? (
            <p
              data-numeric
              className="flex items-center gap-2 text-body text-ink-muted"
            >
              <Users aria-hidden className="size-4 shrink-0" />
              {giveaway.registered_count} registered
            </p>
          ) : null}
        </Surface>

        {/* How you will find out, stated before you commit. */}
        <Surface shape="card" elevation="flat" className="flex flex-col gap-2 bg-tone-info-bg border-l-4 border-l-tone-info-solid p-4">
          <p className="text-body-sm font-semibold text-tone-info-fg">
            {method.label}
          </p>
          <p className="text-caption leading-[1.6] text-ink-secondary">
            {method.hint}
          </p>
          {drawDeadline ? <CountdownPill deadline={drawDeadline} showLabel /> : null}
        </Surface>

        {isGiver ? (
          /* Only a Manual giveaway has anything for its giver to do. FirstCome
             allocates as people register and Random is drawn by the system, so
             offering those givers a "Manage entrants" button led them to a
             screen whose only action was a draw that was never theirs. */
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
                  Picks one entrant at random and closes registration. This
                  cannot be undone.
                </p>
              </div>
            ) : (
              <Surface
                shape="card"
                elevation="flat"
                className="bg-tone-success-bg border-l-4 border-l-tone-success-solid p-4"
              >
                <p className="text-body font-medium text-tone-success-fg">
                  The draw has run. A chat room is open with the winner.
                </p>
              </Surface>
            )
          ) : (
            <Surface
              shape="card"
              elevation="flat"
              className="bg-tone-success-bg border-l-4 border-l-tone-success-solid p-4"
            >
              <p className="text-body font-medium text-tone-success-fg">
                This is your giveaway. Nothing for you to do.
              </p>
              <p className="mt-1 text-caption leading-[1.6] text-ink-secondary">
                {method.hint}. A chat room opens with each entrant as they
                register so you can arrange collection.
              </p>
            </Surface>
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
        ) : joined ? (
          <Surface shape="card" elevation="flat" className="bg-tone-success-bg border-l-4 border-l-tone-success-solid p-4">
            <p className="text-body font-medium text-tone-success-fg">
              Registered. Waiting for the draw.
            </p>
            <p className="mt-1 text-caption leading-[1.6] text-ink-secondary">
              If you are selected, a chat room opens and a QR ticket is issued automatically. You do not need to watch this page.
            </p>
          </Surface>
        ) : giveaway.status === "Active" ? (
          <Button size="lg" block isLoading={busy} onPress={join}>
            <Gift className="size-5" />
            Register for this giveaway
          </Button>
        ) : (
          /* Closed and Completed giveaways stay readable — they are linked
             from tickets and from chat rooms — but they cannot be entered. */
          <Surface shape="card" elevation="flat" className="bg-surface-sunken p-4">
            <StatusBadge status={GIVEAWAY_STATUS[giveaway.status]} size="sm" />
            <p className="mt-2 text-caption leading-[1.6] text-ink-secondary">
              Registration for this giveaway has closed.
            </p>
          </Surface>
        )}
      </div>
    </div>
  );
}
