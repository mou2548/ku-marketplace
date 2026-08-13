"use client";

import { useCallback } from "react";
import { Clock, MapPin } from "lucide-react";

import { ChatThread } from "@/components/kit/chat-thread";
import { QrTicket } from "@/components/kit/qr-ticket";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import type { GiveawayTicket } from "@/lib/api/types";
import { TICKET_STATUS } from "@/lib/status";

export function TicketScreen({ ticket }: { ticket: GiveawayTicket }) {
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

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
      <div className="flex flex-1 flex-col gap-4">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
              {giveaway.item_name}
            </h1>
            <p className="text-[0.875rem] text-ink-muted">You were selected</p>
          </div>
          <StatusBadge status={TICKET_STATUS[ticket.status]} />
        </header>

        <Surface shape="panel" fill="plate" noise className="p-5">
          <QrTicket onGenerate={generate} />
        </Surface>

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
          instructions and show their QR — a broadcast, not a conversation. */}
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
              content: `Collect at ${giveaway.pickup_location} during the stated window. Open your QR in the app so I can scan it.`,
              created_at: ticket.created_at,
            },
          ]}
        />
      </Surface>
    </div>
  );
}
