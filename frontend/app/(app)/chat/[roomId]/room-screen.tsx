"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Flag,
  QrCode,
  ScanLine,
  Truck,
  XCircle,
} from "lucide-react";

import { ActionCard, ChatThread } from "@/components/kit/chat-thread";
import { AppointmentCard } from "@/components/kit/appointment-card";
import { Button, LinkButton } from "@/components/kit/button";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { DeliveryCard } from "@/components/kit/delivery-card";
import { TextInput } from "@/components/kit/field";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { SlipReviewer, SlipUploader } from "@/components/kit/slip";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { TONE_WASH } from "@/components/kit/tone";
import { TransactionStepper } from "@/components/kit/transaction-stepper";
import { TrustBadge } from "@/components/kit/trust-badge";
import type { GiveawayPost, Transaction } from "@/lib/api/types";
import { deadlineFor } from "@/lib/inbox";
import { ROOM_KIND_TONE, type RoomSummary } from "@/lib/rooms";
import {
  canReport,
  requiresPayment,
  resolveTransactionActor,
  TRANSACTION_STATUS,
  type Party,
} from "@/lib/status";
import { cn } from "@/lib/utils";

interface Message {
  message_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

/**
 * The room, shaped like the messaging apps students already use.
 *
 * A review of the first build found three things wrong: no header, so you could
 * not tell who you were talking to without reading the sidebar; the appointment
 * buried in the scroll where it was missed; and the stepper crushed into a
 * 300px rail until its labels were unreadable columns of single words.
 *
 * Fixed by borrowing what LINE and Messenger already do: a sticky header, a
 * pinned card under it, and a thread that ends flush against the composer. The
 * stepper is vertical now, because a five-step horizontal rail never fits a
 * sidebar.
 */
export function RoomScreen({
  summary,
  viewerId,
  transaction,
  giveaway,
  messages,
}: {
  summary: RoomSummary;
  viewerId: number;
  transaction?: Transaction;
  giveaway?: GiveawayPost;
  messages: Message[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const viewer: Party | undefined = transaction
    ? transaction.buyer_id === viewerId
      ? "buyer"
      : "seller"
    : undefined;

  const prompt =
    transaction && viewer ? resolveTransactionActor(transaction, viewer) : undefined;
  const deadline = transaction ? deadlineFor(transaction) : undefined;
  const isYourTurn = prompt?.actor === viewer;
  const reportable = canReport(deadline ? [deadline] : []);

  // Flow 3: only the giver may type in a giveaway room.
  const giveawayReadOnly = !!giveaway && giveaway.giver_id !== viewerId;

  async function act(message: string, next?: string) {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show(message);
    if (next) router.push(next);
  }

  function currentAction(): React.ReactNode {
    if (!transaction || !isYourTurn) return null;

    switch (prompt?.action) {
      case "upload-slip":
        return (
          <ActionCard title="Your step - pay and upload the slip">
            <SlipUploader
              amount={transaction.final_amount}
              onUpload={async () => act("Slip uploaded. Waiting on the seller.")}
            />
          </ActionCard>
        );
      case "review-slip":
        return transaction.slip_image_url &&
          transaction.payment_confirmed_by_buyer_at ? (
          <ActionCard title="Your step - check the slip">
            <SlipReviewer
              slipUrl={transaction.slip_image_url}
              amount={transaction.final_amount}
              buyer={{
                name: transaction.buyer.name,
                isVerified: transaction.buyer.isVerified,
              }}
              uploadedAt={transaction.payment_confirmed_by_buyer_at}
              isBusy={busy}
              onConfirm={() => act("Payment confirmed")}
              onReject={() => act("Told the buyer the amount does not match")}
            />
          </ActionCard>
        ) : null;
      case "enter-tracking":
        return (
          <ActionCard title="Your step - enter the tracking number">
            <div className="flex flex-col gap-3">
              <TextInput
                label="Tracking number"
                value={tracking}
                onChange={setTracking}
                placeholder="TH123456789KE"
                icon={<Truck className="size-4" />}
                hint="The buyer sees this the moment you save it"
              />
              <Button
                block
                isDisabled={!tracking.trim()}
                isLoading={busy}
                onPress={() => act("Tracking number saved")}
              >
                Save and notify the buyer
              </Button>
            </div>
          </ActionCard>
        );
      case "confirm-delivery":
        return (
          <ActionCard title="Your step - confirm the item arrived">
            <div className="flex flex-col gap-3">
              <p className="text-[0.9375rem] leading-[1.7] text-ink-secondary">
                Did the parcel arrive and match what was agreed? Confirm to close
                this deal.
              </p>
              <Button block isLoading={busy} onPress={() => act("Deal closed")}>
                Confirm the item arrived
              </Button>
            </div>
          </ActionCard>
        );
      case "scan-qr":
        return (
          <ActionCard title="Your step - scan the QR at handover">
            <LinkButton
              block
              size="lg"
              href={`/deals/${transaction.transaction_id}/scan`}
            >
              <ScanLine className="size-5" />
              Open the scanner
            </LinkButton>
          </ActionCard>
        );
      case "refund-slip":
        return (
          <ActionCard title="Your step - refund and upload the slip">
            <SlipUploader
              amount={transaction.final_amount}
              onUpload={async () => act("Refund slip uploaded")}
            />
          </ActionCard>
        );
      default:
        return null;
    }
  }

  const sellerQr =
    transaction &&
    transaction.delivery_method === "Meetup" &&
    transaction.status === "Processing" &&
    viewer === "seller" ? (
      <ActionCard title="Let the buyer scan">
        <LinkButton
          block
          size="lg"
          href={`/deals/${transaction.transaction_id}/qr`}
        >
          <QrCode className="size-5" />
          Open QR
        </LinkButton>
      </ActionCard>
    ) : null;

  return (
    <div className="flex gap-6">
      <Surface
        shape="card"
        elevation="flat"
        className="flex min-h-[70dvh] min-w-0 flex-1 flex-col overflow-hidden"
      >
        {/* Header: who, what kind, what about. */}
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Link
            href="/chat"
            aria-label="Back to conversations"
            className="grid size-9 shrink-0 place-items-center rounded-pill text-ink-secondary hover:bg-gray-100 xl:hidden"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </Link>

          <TrustBadge
            name={summary.counterparty.name}
            isVerified={summary.counterparty.isVerified}
            faculty={summary.counterparty.faculty}
            size="sm"
          />

          <span className="ml-auto flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "shrink-0 rounded-chip px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                TONE_WASH[ROOM_KIND_TONE[summary.kind]],
              )}
            >
              {summary.kind}
            </span>
            <span className="hidden min-w-0 truncate text-[0.8125rem] text-ink-muted sm:block">
              {summary.subject}
            </span>
          </span>
        </header>

        {/* Pinned like LINE pins a message: one line, expandable, always the
            first thing under the header. What it pins depends on how the item
            changes hands — a shipped deal has no appointment, so pinning one
            was showing information that does not exist. */}
        {transaction && viewer ? (
          <div
            className={cn(
              "border-b border-line",
              transaction.delivery_method === "Meetup"
                ? "bg-tone-success-bg/60"
                : "bg-tone-info-bg/60",
            )}
          >
            <button
              type="button"
              onClick={() => setPinOpen((v) => !v)}
              aria-expanded={pinOpen}
              className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-[0.8125rem]"
            >
              {transaction.delivery_method === "Meetup" ? (
                <>
                  <CalendarClock
                    aria-hidden
                    className="size-4 shrink-0 text-tone-success-fg"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-tone-success-fg">
                    Meetup · 10 Aug, 13:00 · สำนักหอสมุด มก.
                  </span>
                </>
              ) : (
                <DeliveryCard
                  transaction={transaction}
                  viewer={viewer}
                  compact
                  className="flex-1"
                />
              )}
              {pinOpen ? (
                <ChevronUp aria-hidden className="size-4 shrink-0" />
              ) : (
                <ChevronDown aria-hidden className="size-4 shrink-0" />
              )}
            </button>

            {pinOpen ? (
              <div className="px-4 pb-4">
                {transaction.delivery_method === "Meetup" ? (
                  <AppointmentCard
                    status="Confirmed"
                    scheduledAt="2026-08-10T13:00:00+07:00"
                    place="สำนักหอสมุด มก. (หน้าประตูทางเข้าหลัก)"
                    coordinates="13.8479,100.5697"
                  />
                ) : (
                  <DeliveryCard transaction={transaction} viewer={viewer} />
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <ChatThread
          messages={messages}
          viewerId={viewerId}
          action={currentAction() ?? sellerQr}
          isReadOnly={giveawayReadOnly}
          readOnlyNotice="Only the giver can post here. Ask questions in person at pickup."
          onSend={async () => toast.show("Message sent")}
        />
      </Surface>

      {/* Summary rail. Vertical stepper: five steps across a 300px column is
          what made the labels unreadable in the first build. */}
      {transaction && viewer ? (
        <Surface
          as="aside"
          shape="card"
          className="hidden w-72 shrink-0 flex-col gap-4 self-start p-4 lg:flex"
        >
          <div className="flex flex-col gap-1">
            <Link
              href={`/market/${transaction.post_id}`}
              className="font-semibold hover:underline"
            >
              {transaction.post.item.name}
            </Link>
            <StatusBadge
              status={TRANSACTION_STATUS[transaction.status]}
              size="sm"
              className="w-fit"
            />
            <p className="text-[0.8125rem] text-ink-muted">
              {transaction.delivery_method === "Meetup" ? "Meetup" : "Shipping"}
              {requiresPayment(transaction)
                ? ` · ฿${transaction.final_amount.toLocaleString("en-GB")}`
                : " · trade, no money"}
            </p>
          </div>

          {prompt ? (
            <p
              className={cn(
                "rounded-control px-3 py-2 text-[0.875rem] font-medium",
                TONE_WASH[prompt.tone],
              )}
            >
              {prompt.label}
            </p>
          ) : null}

          <TransactionStepper
            transaction={transaction}
            className="!flex-col !gap-0"
          />

          {transaction.delivery_method === "Shipping" ? (
            <DeliveryCard transaction={transaction} viewer={viewer} />
          ) : deadline ? (
            <div className="flex flex-col gap-1.5 border-t border-line pt-3">
              <p className="text-[0.75rem] text-ink-muted">{deadline.label}</p>
              <CountdownPill deadline={deadline} />
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            {reportable ? (
              <LinkButton
                variant="secondary"
                size="sm"
                block
                href={`/deals/${transaction.transaction_id}/report`}
              >
                <Flag className="size-4" />
                Report a problem
              </LinkButton>
            ) : null}

            {transaction.status === "Pending" ||
            transaction.status === "Processing" ? (
              <OverlayTrigger>
                <Button variant="ghost" size="sm" block>
                  <XCircle className="size-4" />
                  Request cancellation
                </Button>
                <Overlay
                  title="Request to cancel this deal"
                  description="The other side has 72 hours to respond. If they do not, it goes to an admin."
                  footer={
                    <>
                      <Button variant="ghost" slot="close">
                        Keep the deal
                      </Button>
                      <Button
                        variant="danger"
                        isLoading={busy}
                        onPress={() => act("Cancellation requested")}
                      >
                        Send cancellation request
                      </Button>
                    </>
                  }
                >
                  <TextInput
                    label="Reason"
                    placeholder="e.g. I can no longer make the meetup"
                    hint="A reason helps a lot. If the other side rejects it, this is the context an admin will see."
                  />
                </Overlay>
              </OverlayTrigger>
            ) : null}
          </div>
        </Surface>
      ) : null}

      {giveaway ? (
        <Surface
          as="aside"
          shape="card"
          className="hidden w-72 shrink-0 flex-col gap-3 self-start p-4 lg:flex"
        >
          <p className="font-semibold">{giveaway.item_name}</p>
          <p className="text-[0.8125rem] leading-[1.6] text-ink-muted">
            Collect at {giveaway.pickup_location}
          </p>
          <LinkButton
            size="sm"
            block
            href={`/giveaway/${giveaway.giveaway_id}/manage`}
          >
            Manage entrants
          </LinkButton>
        </Surface>
      ) : null}
    </div>
  );
}
