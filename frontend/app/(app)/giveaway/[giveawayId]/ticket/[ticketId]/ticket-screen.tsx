"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Gift, MapPin } from "lucide-react";

import { Button } from "@/components/kit/button";
import { ChatThread } from "@/components/kit/chat-thread";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { PostImage } from "@/components/kit/post-image";
import { QrTicket } from "@/components/kit/qr-ticket";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { TrustBadge } from "@/components/kit/trust-badge";
import { useToast } from "@/components/kit/toast";
import { forfeitTicket, generateTicketQr } from "@/lib/actions/giveaways";
import type { ApiError } from "@/lib/api/client";
import type { GiveawayTicket } from "@/lib/api/types";
import { TICKET_STATUS } from "@/lib/status";

export function TicketScreen({ ticket }: { ticket: GiveawayTicket }) {
  const t = useTranslations();
  const { giveaway } = ticket;
  const router = useRouter();
  const toast = useToast();
  const [forfeiting, setForfeiting] = useState(false);

  const generate = useCallback(
    () => generateTicketQr(giveaway.giveaway_id, ticket.ticket_id),
    [giveaway.giveaway_id, ticket.ticket_id],
  );

  async function forfeit() {
    setForfeiting(true);
    try {
      await forfeitTicket(ticket.ticket_id);
      toast.show("Ticket forfeited.");
      router.push(`/giveaway/${giveaway.giveaway_id}`);
    } catch (error) {
      toast.show((error as ApiError).message ?? "Could not forfeit. Try again.");
    } finally {
      setForfeiting(false);
    }
  }

  const pickupBy = giveaway.registered_deadline
    ? new Date(giveaway.registered_deadline).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="flex flex-1 flex-col gap-4">
        <header className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <span className="block overflow-hidden rounded-card shadow-flat">
            <PostImage
              src={giveaway.images[0]?.image_url}
              alt=""
              aspectRatio={1}
              sizes="112px"
              className="h-full"
            />
          </span>
          <div className="flex min-w-0 flex-col justify-center gap-2">
            <p className="text-overline font-semibold text-tone-warning-fg uppercase">
              {t("giveaway.collectionTicket")}
            </p>
            <h1 className="text-h1 text-balance">
              {giveaway.item_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={TICKET_STATUS[ticket.status]} />
              <span className="text-body-sm text-ink-muted">
                {t("giveaway.selected")}
              </span>
            </div>
          </div>
        </header>

        <Surface shape="panel" className="overflow-hidden p-0">
          <div aria-hidden className="h-1 bg-tone-warning-solid" />
          <div className="p-5">
            <QrTicket onGenerate={generate} />
          </div>
          <div className="flex items-start gap-2 bg-tone-warning-bg px-5 py-3 text-caption text-tone-warning-fg">
            <Gift aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{t("giveaway.ticketHint")}</span>
          </div>
        </Surface>

        <Surface shape="card" className="flex flex-col gap-2.5 p-4">
          <p className="flex items-center gap-2 text-body">
            <MapPin aria-hidden className="size-4 shrink-0 text-ink-muted" />
            {giveaway.pickup_location}
          </p>
          {pickupBy ? (
            <p className="flex items-center gap-2 text-body">
              <Clock aria-hidden className="size-4 shrink-0 text-ink-muted" />
              {t("giveaway.collectBy", { date: pickupBy })}
            </p>
          ) : null}
          <TrustBadge
            name={giveaway.giver.name}
            isVerified={giveaway.giver.isVerified}
            faculty={giveaway.giver.faculty}
            size="sm"
          />
        </Surface>

        {ticket.status === "Waiting" ? (
          <OverlayTrigger>
            <Button variant="secondary">Forfeit this ticket</Button>
            <Overlay
              title="Forfeit this ticket?"
              description="You will lose your place. This cannot be undone, and it will not be offered to anyone else."
              footer={
                <>
                  <Button variant="ghost" slot="close">
                    Keep my ticket
                  </Button>
                  <Button variant="danger" isLoading={forfeiting} onPress={forfeit}>
                    Yes, forfeit
                  </Button>
                </>
              }
            >
              <p className="text-body text-ink-secondary">
                Forfeiting frees you from collecting {giveaway.item_name}, but
                the giver will not re-open your place to anyone else.
              </p>
            </Overlay>
          </OverlayTrigger>
        ) : null}
      </div>

      {/* Flow 3: only the giver may type in a giveaway room. Receivers read the
          instructions and show their QR — a broadcast, not a conversation. */}
      <Surface
        shape="card"
        elevation="raised"
        className="flex min-h-[20rem] flex-col overflow-hidden lg:sticky lg:top-24"
      >
        <h2 className="border-b border-line px-4 py-3 text-body font-semibold text-ink">
          {t("giveaway.giverNotes")}
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
