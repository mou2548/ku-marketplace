"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Flag,
  MapPin,
  QrCode,
  ScanLine,
  Truck,
  XCircle,
} from "lucide-react";

import { ActionCard, ChatThread } from "@/components/kit/chat-thread";
import { AppointmentCard } from "@/components/kit/appointment-card";
import { Button, LinkButton } from "@/components/kit/button";
import { CountdownPill } from "@/components/kit/countdown-pill";
import { DatePickerField } from "@/components/kit/date-picker";
import { DeliveryCard } from "@/components/kit/delivery-card";
import { TextInput } from "@/components/kit/field";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { PostImage } from "@/components/kit/post-image";
import { SlipReviewer, SlipUploader } from "@/components/kit/slip";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { TONE_WASH } from "@/components/kit/tone";
import { buildSteps, TransactionStepper } from "@/components/kit/transaction-stepper";
import { TrustBadge } from "@/components/kit/trust-badge";
import type { AppointmentSeed, Entrant } from "@/lib/api/fixtures";
import type { GiveawayPost, Transaction, UserSummary } from "@/lib/api/types";
import { deadlineFor } from "@/lib/inbox";
import { ROOM_KIND_TONE, type RoomSummary } from "@/lib/rooms";
import {
  ALLOCATION_METHOD,
  canReport,
  ENTRANT_STATUS,
  requiresPayment,
  resolveTransactionActor,
  TRANSACTION_STATUS,
  type Party,
} from "@/lib/status";
import { cn } from "@/lib/utils";

/** Past this many, the rail sends the giver to the manage screen instead. */
const ROSTER_LIMIT = 5;

interface Message {
  message_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

/** "Mon 10 Aug, 13:00 · สำนักหอสมุด มก." — the pinned one-liner. */
function appointmentLabel(appointment: AppointmentSeed): string {
  const at = new Date(`${appointment.date}T${appointment.time}+07:00`);
  const when = at.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${when} · ${appointment.location}`;
}

/**
 * `POST /transactions/{id}/appointment-card`. Flow 1 puts this between the
 * seller confirming payment and the handover, and until now the UI had no way
 * to create one — the pin showed a fixed date that belonged to no transaction.
 */
function ProposeMeetup({
  place,
  onPlaceChange,
  when,
  onWhenChange,
  isBusy,
  onPropose,
}: {
  place: string;
  onPlaceChange: (value: string) => void;
  when: DateValue | null;
  onWhenChange: (value: DateValue | null) => void;
  isBusy: boolean;
  onPropose: () => void;
}) {
  const tz = getLocalTimeZone();

  return (
    <Surface shape="card" className="flex flex-col gap-3 p-4">
      <p className="text-[0.875rem] leading-[1.6] text-ink-secondary">
        Agree a time and place. The other side confirms it, and both of you see
        the same card from then on.
      </p>

      <DatePickerField
        label="Date"
        value={when}
        onChange={onWhenChange}
        minValue={today(tz)}
      />

      <TextInput
        label="Where"
        value={place}
        onChange={onPlaceChange}
        icon={<MapPin className="size-4" />}
        placeholder="e.g. สำนักหอสมุด มก. (หน้าประตูทางเข้าหลัก)"
        hint="Somewhere public and busy on campus"
      />

      <Button
        block
        isDisabled={!when || place.trim().length === 0}
        isLoading={isBusy}
        onPress={onPropose}
      >
        <CalendarPlus className="size-4" />
        Propose this meetup
      </Button>
    </Surface>
  );
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
  appointment,
  entrants,
  messages,
}: {
  summary: RoomSummary;
  viewerId: number;
  transaction?: Transaction;
  giveaway?: GiveawayPost;
  /** The Appointment_Card row for this deal, when one has been proposed. */
  appointment?: AppointmentSeed;
  /** Everyone in a giveaway room. See docs/design/api-gaps.md. */
  entrants?: Entrant[];
  messages: Message[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tracking, setTracking] = useState("");
  const [place, setPlace] = useState("");
  const [when, setWhen] = useState<DateValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const viewer: Party | undefined = transaction
    ? transaction.buyer_id === viewerId
      ? "buyer"
      : "seller"
    : undefined;

  const prompt =
    transaction && viewer ? resolveTransactionActor(transaction, viewer) : undefined;
  // Same derivation the stepper runs, for the "Step n of m" counter above it.
  const steps = transaction ? buildSteps(transaction, appointment?.status) : [];
  const currentStep = steps.findIndex((s) => s.current);
  // Every step done means the deal is finished, not that it is back at step 1.
  const currentStepNumber = currentStep === -1 ? steps.length : currentStep + 1;
  const deadline = transaction ? deadlineFor(transaction) : undefined;
  const isYourTurn = prompt?.actor === viewer;
  const reportable = canReport(deadline ? [deadline] : []);

  // Flow 3: only the giver may type in a giveaway room.
  const giveawayReadOnly = !!giveaway && giveaway.giver_id !== viewerId;

  // A giveaway room holds the giver plus every recipient, and a bubble that is
  // not yours could be any of them. Naming senders needs a roster; a deal room
  // has exactly two people and the header already names the other one.
  const isGroupRoom = !!giveaway;
  const senders = useMemo(() => {
    const map = new Map<number, UserSummary>();
    if (giveaway) map.set(giveaway.giver_id, giveaway.giver);
    for (const e of entrants ?? []) map.set(e.receiver_id, e.user);
    return map;
  }, [giveaway, entrants]);

  // Where this conversation came from, and its photo. Both kinds of room have
  // one; only the transaction kind was ever linked, and only above 1024px.
  const subjectHref = transaction
    ? `/market/${transaction.post_id}`
    : giveaway
      ? `/giveaway/${giveaway.giveaway_id}`
      : null;
  const subjectImage = transaction
    ? (transaction.post.item.images.find((i) => i.is_primary)?.image_url ??
      transaction.post.item.images[0]?.image_url)
    : giveaway?.images[0]?.image_url;

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
              href={`/history/${transaction.transaction_id}/scan`}
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
          href={`/history/${transaction.transaction_id}/qr`}
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
        elevation="none"
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

          {/* In a group room the counterparty is the giver, so the bare name
              reads as "the person you are talking to" when it is not. */}
          <span className="flex min-w-0 items-center gap-2">
            <TrustBadge
              name={summary.counterparty.name}
              isVerified={summary.counterparty.isVerified}
              faculty={summary.counterparty.faculty}
              avatarUrl={summary.counterparty.avatar_url}
              size="sm"
            />
            {isGroupRoom ? (
              <span className="shrink-0 rounded-chip bg-gray-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ink-secondary">
                Giver
              </span>
            ) : null}
          </span>

          <span className="ml-auto flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "shrink-0 rounded-chip px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                TONE_WASH[ROOM_KIND_TONE[summary.kind]],
              )}
            >
              {summary.kind}
            </span>
            {/* The subject was dead text, and on anything under 640px it was
                not even shown — so a room had no route back to the thing it is
                about. */}
            {subjectHref ? (
              <Link
                href={subjectHref}
                className="min-w-0 truncate text-[0.8125rem] text-ink-brand hover:underline"
              >
                {summary.subject}
              </Link>
            ) : (
              <span className="min-w-0 truncate text-[0.8125rem] text-ink-muted">
                {summary.subject}
              </span>
            )}
          </span>
        </header>

        {/* The rail below is desktop-only, so on a phone this strip is the only
            way out of the room and into the item, the listing, or the record. */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 lg:hidden">
          <span className="block w-11 shrink-0 overflow-hidden rounded-slot">
            <PostImage src={subjectImage} alt="" aspectRatio={1} sizes="44px" />
          </span>

          <div className="min-w-0 flex-1">
            {subjectHref ? (
              <Link
                href={subjectHref}
                className="block truncate text-[0.875rem] font-semibold hover:underline"
              >
                {summary.subject}
              </Link>
            ) : (
              <p className="truncate text-[0.875rem] font-semibold">
                {summary.subject}
              </p>
            )}
            <p className="truncate text-[0.75rem] text-ink-muted">
              {transaction
                ? `${transaction.delivery_method === "Meetup" ? "Meetup" : "Shipping"}${
                    requiresPayment(transaction)
                      ? ` · ฿${transaction.final_amount.toLocaleString("en-GB")}`
                      : " · trade, no money"
                  }`
                : giveaway
                  ? `Collect at ${giveaway.pickup_location}`
                  : null}
            </p>
          </div>

          {transaction ? (
            <StatusBadge
              status={TRANSACTION_STATUS[transaction.status]}
              size="sm"
              iconOnly
            />
          ) : null}
        </div>

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
                  {/* The real Appointment_Card row. This line used to be a
                      hardcoded date that every Meetup deal in the app claimed
                      as its own. */}
                  <span className="min-w-0 flex-1 truncate font-medium text-tone-success-fg">
                    {appointment
                      ? `Meetup · ${appointmentLabel(appointment)}`
                      : "No time agreed yet"}
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
                {transaction.delivery_method !== "Meetup" ? (
                  <DeliveryCard transaction={transaction} viewer={viewer} />
                ) : appointment ? (
                  <AppointmentCard
                    status={appointment.status}
                    scheduledAt={`${appointment.date}T${appointment.time}+07:00`}
                    place={appointment.location}
                    // Only the side that did not propose it can answer it.
                    awaitingViewer={appointment.proposed_by !== viewerId}
                    onAccept={() => act("Meetup confirmed")}
                    onDecline={() => act("Asked for another time")}
                  />
                ) : (
                  /* Flow 1 puts the appointment after the payment is confirmed
                     and before the QR scan, and the API has a card to create.
                     With no row yet, the pin is where you make one. */
                  <ProposeMeetup
                    place={place}
                    onPlaceChange={setPlace}
                    when={when}
                    onWhenChange={setWhen}
                    isBusy={busy}
                    onPropose={() => act("Meetup proposed. Waiting on a reply.")}
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <ChatThread
          messages={messages}
          viewerId={viewerId}
          senders={senders}
          showSenders={isGroupRoom}
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

          {/* A bare column of dots does not announce what it is measuring. */}
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-overline text-ink-muted uppercase">
                Deal progress
              </p>
              <p data-numeric className="text-[0.75rem] text-ink-muted">
                Step {currentStepNumber} of {steps.length}
              </p>
            </div>
            <TransactionStepper
              transaction={transaction}
              appointmentStatus={appointment?.status}
              orientation="vertical"
              viewer={viewer}
              counterpartyName={summary.counterparty.name}
            />
          </div>

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
                href={`/history/${transaction.transaction_id}/report`}
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
          <Link
            href={`/giveaway/${giveaway.giveaway_id}`}
            className="font-semibold hover:underline"
          >
            {giveaway.item_name}
          </Link>
          <StatusBadge
            status={ALLOCATION_METHOD[giveaway.allocation_method]}
            size="sm"
            className="w-fit"
          />
          <p className="flex items-start gap-2 text-[0.8125rem] leading-[1.6] text-ink-muted">
            <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Collect at {giveaway.pickup_location}
          </p>

          {/* The rail listed the item and the pickup point and nobody at all,
              in the one kind of room that holds more than two people. */}
          {entrants?.length ? (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <p className="text-overline text-ink-muted uppercase">
                In this room
              </p>

              <span className="flex items-center gap-2">
                <TrustBadge
                  size="sm"
                  name={giveaway.giver.name}
                  isVerified={giveaway.giver.isVerified}
                  avatarUrl={giveaway.giver.avatar_url}
                />
                <span className="ml-auto shrink-0 rounded-chip bg-gray-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ink-secondary">
                  Giver
                </span>
              </span>

              <ul className="flex flex-col gap-2">
                {entrants.slice(0, ROSTER_LIMIT).map((e) => (
                  <li key={e.receiver_id} className="flex items-center gap-2">
                    <TrustBadge
                      size="sm"
                      name={e.user.name}
                      isVerified={e.user.isVerified}
                      avatarUrl={e.user.avatar_url}
                    />
                    <StatusBadge
                      status={ENTRANT_STATUS[e.status]}
                      size="sm"
                      className="ml-auto shrink-0"
                    />
                  </li>
                ))}
              </ul>

              {entrants.length > ROSTER_LIMIT ? (
                <Link
                  href={`/giveaway/${giveaway.giveaway_id}/manage`}
                  className="text-[0.8125rem] font-medium text-ink-brand hover:underline"
                >
                  {entrants.length - ROSTER_LIMIT} more
                </Link>
              ) : null}
            </div>
          ) : null}

          {/* Only a Manual giveaway has a manage screen — the route 404s for
              the other two, and this button sent every giver at it. */}
          {giveaway.giver_id === viewerId &&
          giveaway.allocation_method === "Manual" ? (
            <LinkButton
              size="sm"
              block
              href={`/giveaway/${giveaway.giveaway_id}/manage`}
            >
              Choose recipients
            </LinkButton>
          ) : (
            <LinkButton
              variant="secondary"
              size="sm"
              block
              href={`/giveaway/${giveaway.giveaway_id}`}
            >
              Open the giveaway
            </LinkButton>
          )}
        </Surface>
      ) : null}
    </div>
  );
}
