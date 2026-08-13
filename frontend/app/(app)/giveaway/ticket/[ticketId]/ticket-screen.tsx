"use client";

import { useCallback } from "react";
import { CircleX, Clock, Hourglass, MapPin, PartyPopper, TimerOff } from "lucide-react";

import { ChatThread } from "@/components/kit/chat-thread";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { QrTicket } from "@/components/kit/qr-ticket";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import type { GiveawayTicket } from "@/lib/api/types";
import { ALLOCATION_METHOD, TICKET_STATUS } from "@/lib/status";

// Flow 3: the shared chat room only opens once a ticket has a place —
// `Waiting`, `Received` and `Expired` all had one at some point. `Registered`
// (still queuing) and `Not_Selected` never did, so there is nothing to read.
const HAS_CHAT_ROOM: Record<GiveawayTicket["status"], boolean> = {
  Registered: false,
  Waiting: true,
  Received: true,
  Not_Selected: false,
  Expired: true,
};

const SUBTITLE: Record<GiveawayTicket["status"], string> = {
  Registered: "Waiting for the draw",
  Waiting: "You were selected",
  Received: "Collected",
  Not_Selected: "This place went to someone else",
  Expired: "The pickup window closed before you collected",
};

export function TicketScreen({
  ticket,
  queuePosition,
}: {
  ticket: GiveawayTicket;
  /** Only set while `status` is `Registered` on a `FirstCome` giveaway. */
  queuePosition?: number;
}) {
  const { giveaway } = ticket;

  // POST /giveaways/{id}/tickets/{ticket_id}/qr/generate
  const generate = useCallback(
    async () => `ku-gv-${ticket.ticket_id}-${Date.now()}`,
    [ticket.ticket_id],
  );

  const pickupWindow =
    giveaway.pickup_start_date && giveaway.pickup_end_date
      ? `${new Date(giveaway.pickup_start_date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })} – ${new Date(giveaway.pickup_end_date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}`
      : null;

  const drawDeadline = giveaway.registered_deadline
    ? {
        kind: "giveaway-pickup" as const,
        expiresAt: Date.parse(giveaway.registered_deadline),
        label: "Draw",
        onExpiry: "forfeit" as const,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
      <div className="flex flex-1 flex-col gap-4">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
              {giveaway.item_name}
            </h1>
            <p className="text-[0.875rem] text-ink-muted">
              {SUBTITLE[ticket.status]}
            </p>
          </div>
          <StatusBadge status={TICKET_STATUS[ticket.status]} />
        </header>

        {ticket.status === "Waiting" ? (
          <Surface shape="panel" fill="plate" noise className="p-5">
            <QrTicket onGenerate={generate} />
          </Surface>
        ) : ticket.status === "Registered" ? (
          <Surface
            shape="card"
            elevation="flat"
            className="flex flex-col gap-3 bg-tone-info-bg border-l-4 border-l-tone-info-solid p-5"
          >
            <div className="flex items-center gap-3">
              <Hourglass
                aria-hidden
                className="size-6 shrink-0 text-tone-info-fg"
              />
              {queuePosition !== undefined ? (
                <p
                  data-numeric
                  className="text-[1.125rem] font-bold text-tone-info-fg"
                >
                  #{queuePosition} in line
                </p>
              ) : (
                <p className="text-[0.9375rem] font-medium text-tone-info-fg">
                  Registered
                </p>
              )}
            </div>
            <p className="text-[0.8125rem] leading-[1.6] text-ink-secondary">
              {ALLOCATION_METHOD[giveaway.allocation_method].hint}
            </p>
            {drawDeadline ? (
              <CountdownPill deadline={drawDeadline} showLabel />
            ) : null}
          </Surface>
        ) : ticket.status === "Received" ? (
          <Surface
            shape="card"
            elevation="flat"
            className="flex items-center gap-3 bg-tone-success-bg border-l-4 border-l-tone-success-solid p-5"
          >
            <PartyPopper
              aria-hidden
              className="size-6 shrink-0 text-tone-success-fg"
            />
            <p className="text-[0.9375rem] font-medium text-tone-success-fg">
              You collected this at {giveaway.pickup_location}.
            </p>
          </Surface>
        ) : ticket.status === "Not_Selected" ? (
          <Surface
            shape="card"
            elevation="flat"
            className="flex items-center gap-3 bg-tone-danger-bg border-l-4 border-l-tone-danger-solid p-5"
          >
            <CircleX
              aria-hidden
              className="size-6 shrink-0 text-tone-danger-fg"
            />
            <p className="text-[0.9375rem] font-medium text-tone-danger-fg">
              Someone else was chosen for this giveaway.
            </p>
          </Surface>
        ) : (
          <Surface
            shape="card"
            elevation="flat"
            className="flex items-center gap-3 bg-tone-danger-bg border-l-4 border-l-tone-danger-solid p-5"
          >
            <TimerOff
              aria-hidden
              className="size-6 shrink-0 text-tone-danger-fg"
            />
            <p className="text-[0.9375rem] font-medium text-tone-danger-fg">
              This place was yours, but the pickup window closed before it was
              collected.
            </p>
          </Surface>
        )}

        <Surface shape="card" className="flex flex-col gap-2.5 p-4">
          <p className="flex items-center gap-2 text-[0.9375rem]">
            <MapPin aria-hidden className="size-4 shrink-0 text-ink-muted" />
            {giveaway.pickup_location}
          </p>
          {pickupWindow ? (
            <p className="flex items-center gap-2 text-[0.9375rem]">
              <Clock aria-hidden className="size-4 shrink-0 text-ink-muted" />
              Collect {pickupWindow}
            </p>
          ) : null}
          <TrustBadge
            name={giveaway.giver.name}
            isVerified={giveaway.giver.isVerified}
            faculty={giveaway.giver.faculty}
            size="sm"
          />
        </Surface>
      </div>

      {/* Flow 3: only the giver may type in a giveaway room. Receivers read the
          instructions and show their QR — a broadcast, not a conversation.
          The room itself only exists once a ticket has held a place. */}
      {HAS_CHAT_ROOM[ticket.status] ? (
        <Surface
          shape="card"
          elevation="raised"
          className="flex min-h-[20rem] flex-col overflow-hidden lg:w-80"
        >
          <h2 className="border-b border-line px-4 py-3 text-[0.8125rem] font-semibold tracking-[0.09em] text-ink-muted uppercase">
            Notes from the giver
          </h2>
          <ChatThread
            viewerId={ticket.receiver_id}
            isReadOnly
            readOnlyNotice="Only the giver can post here. Ask questions in person at pickup."
            messages={[
              {
                message_id: 1,
                sender_id: giveaway.giver_id,
                content:
                  ticket.status === "Waiting"
                    ? `Collect at ${giveaway.pickup_location} during the stated window. Open your QR in the app so I can scan it.`
                    : `Collect at ${giveaway.pickup_location} during the stated window.`,
                created_at: ticket.created_at,
              },
            ]}
          />
        </Surface>
      ) : null}
    </div>
  );
}
