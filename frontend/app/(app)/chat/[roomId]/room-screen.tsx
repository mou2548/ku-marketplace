"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getLocalTimeZone, parseDate, today, type DateValue } from "@internationalized/date";
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
import { controlBase, TextInput } from "@/components/kit/field";
import { Overlay, OverlayTrigger } from "@/components/kit/overlay";
import { PostImage } from "@/components/kit/post-image";
import { ReportDialog } from "@/components/kit/report-dialog";
import { SlipReviewer, SlipUploader } from "@/components/kit/slip";
import { QrTicket } from "@/components/kit/qr-ticket";
import { StatusBadge } from "@/components/kit/status-badge";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import {
  askToCancel,
  answerCancellation,
  confirmRefundReceived,
  confirmItemArrived,
  confirmSlip,
  createHandoverToken,
  saveTracking,
  submitPaymentSlip,
  submitRefundSlip,
} from "@/lib/actions/transactions";
import { TONE_CHIP } from "@/components/kit/tone";
import {
  buildSteps,
  TransactionStepper,
  type Step,
} from "@/components/kit/transaction-stepper";
import { TrustBadge } from "@/components/kit/trust-badge";
import {
  fetchAppointmentCards,
  fetchChatHistory,
  proposeAppointment,
  respondToAppointment,
  sendChatMessage,
  uploadChatImage,
} from "@/lib/actions/chat";
import { useStatusText } from "@/lib/i18n/status-text";
import { fetchGiveawayMessages, sendGiveawayMessage } from "@/lib/actions/giveaways";
import { ApiError } from "@/lib/api/client";
import type {
  AppointmentCardData,
  ChatMessage,
  Entrant,
  GiveawayPost,
  Transaction,
  UserSummary,
} from "@/lib/api/types";
import { deriveAppointmentView } from "@/lib/appointment";
import { useNow } from "@/lib/use-now";
import { deadlineFor } from "@/lib/inbox";
import { ROOM_KIND_TONE, type RoomSummary } from "@/lib/rooms";
import {
  ALLOCATION_METHOD,
  canReport,
  ENTRANT_STATUS,
  requiresPayment,
  resolveTransactionActor,
  TRANSACTION_STATUS,
  type ActorPrompt,
  type Deadline,
  type Party,
} from "@/lib/status";
import { usePolling } from "@/lib/use-polling";
import { cn } from "@/lib/utils";

/** Past this many, the rail sends the giver to the manage screen instead. */
const ROSTER_LIMIT = 5;

/** No realtime transport exists — a short poll keeps the thread from going
 * stale instead. See lib/use-polling.ts. */
const CHAT_POLL_INTERVAL_MS = 5000;

/** §7.5.2 — the system-provided reasons for a user report. */
const USER_REPORT_REASONS = [
  {
    id: "rude-or-threatening",
    label: "Rude or threatening behavior in chat",
    description: "Insults, threats, or hostile messages",
  },
  {
    id: "spam-or-disturbance",
    label: "Spam or disturbance",
    description: "Repeated unwanted messages",
  },
  {
    id: "impersonation",
    label: "Impersonating someone else",
    description: "This is not who they claim to be",
  },
];

/** "Mon 10 Aug, 13:00 · สำนักหอสมุด มก." — the pinned one-liner. */
function appointmentLabel(appointment: AppointmentCardData): string {
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
  time,
  onTimeChange,
  isBusy,
  onPropose,
  submitLabel,
  onDiscard,
}: {
  place: string;
  onPlaceChange: (value: string) => void;
  when: DateValue | null;
  onWhenChange: (value: DateValue | null) => void;
  time: string;
  onTimeChange: (value: string) => void;
  isBusy: boolean;
  onPropose: () => void;
  /** Defaults to "Propose this meetup" — "Resend" when editing an existing card. */
  submitLabel?: string;
  /** Present only when editing an existing card — closes the form without
   * calling the API, leaving the card on screen untouched. */
  onDiscard?: () => void;
}) {
  const t = useTranslations();
  const tz = getLocalTimeZone();

  return (
    <Surface shape="card" className="flex flex-col gap-3 p-4">
      <p className="text-body-sm leading-[1.6] text-ink-secondary">
        Agree a time and place. The other side confirms it, and both of you see
        the same card from then on.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <DatePickerField
          label={t("deal.date")}
          value={when}
          onChange={onWhenChange}
          minValue={today(tz)}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium text-ink-secondary">{t("deal.time")}</span>
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className={cn(controlBase, "h-12 px-3.5 text-body")}
          />
        </label>
      </div>

      <TextInput
        label={t("deal.where")}
        value={place}
        onChange={onPlaceChange}
        icon={<MapPin className="size-4" />}
        placeholder={t("deal.wherePlaceholder")}
        hint={t("deal.whereHint")}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {onDiscard ? (
          <Button variant="secondary" block isDisabled={isBusy} onPress={onDiscard}>
            {t("deal.discardChanges")}
          </Button>
        ) : null}
        <Button
          block
          isDisabled={!when || place.trim().length === 0}
          isLoading={isBusy}
          onPress={onPropose}
        >
          <CalendarPlus className="size-4" />{submitLabel ?? t("deal.proposeMeetup")}</Button>
      </div>
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
  appointment: initialAppointment,
  entrants,
  messages: initialMessages,
}: {
  summary: RoomSummary;
  viewerId: number;
  transaction?: Transaction;
  giveaway?: GiveawayPost;
  /**
   * The card currently worth showing for this deal — the most recent
   * `Pending` proposal if one is awaiting a reply, else the pinned
   * `Confirmed` card, else `undefined`. `lib/api/chat.ts`'s
   * `deriveAppointmentView` computes this from the full history; there is no
   * single "current appointment" row in the backend.
   */
  appointment?: AppointmentCardData;
  /** Everyone in a giveaway room. See docs/design/api-gaps.md. */
  entrants?: Entrant[];
  messages: ChatMessage[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const st = useStatusText();
  const [tracking, setTracking] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [place, setPlace] = useState("");
  const [when, setWhen] = useState<DateValue | null>(null);
  const [time, setTime] = useState("12:00");
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  /** Toggles the pin between showing the current AppointmentCard and showing
   * the pre-filled edit form for it — never both, which is what used to make
   * an edited appointment look like it had split into two cards. */
  const [editingAppointment, setEditingAppointment] = useState(false);
  const appointmentPinRef = useRef<HTMLDivElement>(null);
  /**
   * The deal strip's disclosure — everything the desktop rail used to hold.
   *
   * Open when the next move is the viewer's. A closed accordion is a
   * reasonable default for a deal you are waiting on; it is the wrong one for
   * a deal that is waiting on you.
   */
  const [detailToggled, setDetailToggled] = useState<boolean | null>(null);

  // Real messages refresh on a poll (no realtime transport exists) — for
  // either a transaction room or a giveaway group room. Appointments are a
  // transaction-only concept.
  const [messages, setMessages] = useState(initialMessages);
  const [appointment, setAppointment] = useState(initialAppointment);

  usePolling(() => {
    if (transaction) {
      const transactionId = transaction.transaction_id;
      fetchChatHistory(transactionId).then(setMessages).catch(() => {});
      fetchAppointmentCards(transactionId)
        .then((cards) => {
          const { pinned, pending } = deriveAppointmentView(cards);
          setAppointment(pending ?? pinned);
        })
        .catch(() => {});
    } else if (giveaway) {
      fetchGiveawayMessages(giveaway.giveaway_id).then(setMessages).catch(() => {});
    }
  }, CHAT_POLL_INTERVAL_MS);

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
  // Flow 1: a meetup cannot be arranged ahead of payment. `uploadPaymentSlip`
  // (backend) is what moves status Pending -> Processing, so still-Pending
  // means the buyer has not paid yet on a deal that needs payment at all —
  // the backend now rejects `createAppointment` for exactly this case, this
  // just keeps the pin from offering a form that would only 400.
  const meetupBlockedOnPayment =
    !!transaction &&
    transaction.delivery_method === "Meetup" &&
    transaction.status === "Pending" &&
    requiresPayment(transaction);
  const isYourTurn = prompt?.actor === viewer;
  /* Null means nobody has touched it, so the deal decides: open when the next
     move is yours. Once opened or closed by hand, that choice sticks. */
  const detailOpen = detailToggled ?? isYourTurn;
  const now = useNow();
  // §QR refresh loop — QrTicket schedules its own re-issue (every `periodMs`).
  // Passing a fresh inline `() => createHandoverToken(id)` on every render made
  // its effect re-run each second (this screen re-renders on `useNow` and the
  // chat poll), so it fetched a new token constantly. A stable callback keyed
  // only on the transaction id lets the timer actually wait.
  const txIdForHandover = transaction?.transaction_id ?? null;
  const requestHandoverToken = useCallback(() => {
    if (txIdForHandover == null) {
      throw new Error("This room has no transaction");
    }
    return createHandoverToken(txIdForHandover);
  }, [txIdForHandover]);
  const missedMeetup = appointment?.status === "Confirmed" &&
    new Date(`${appointment.date}T${appointment.time}+07:00`).getTime() <= now &&
    transaction && !["Completed", "Cancelled", "Refunded"].includes(transaction.status);
  const reportable = canReport(deadline ? [deadline] : [], now) || Boolean(missedMeetup);

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

  /**
   * Every transition on this screen goes through here. It used to be a 400ms
   * timer that toasted success, which is why the stepper — derived from the
   * transaction's timestamp columns — could never advance.
   *
   * `router.refresh()` re-runs the server component that fetched the
   * transaction, so the stepper, the prompt and the pinned card all move on
   * the answer rather than on the toast.
   */
  async function act(
    call: () => Promise<unknown>,
    message: string,
    failure: string,
    next?: string,
  ) {
    setBusy(true);
    try {
      await call();
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : failure);
      return;
    }
    setBusy(false);
    toast.success(message);
    if (next) {
      router.push(next);
    } else if (pathname !== `/chat/${summary.room_id}`) {
      // The inbox preview is selected by queue priority, which changes after
      // accepting a payment. Keep this conversation instead of picking again.
      router.replace(`/chat/${summary.room_id}`);
    } else {
      router.refresh();
    }
  }

  async function handleSend(text: string) {
    try {
      const sent = transaction
        ? await sendChatMessage(transaction.transaction_id, { content: text })
        : giveaway
          ? await sendGiveawayMessage(giveaway.giveaway_id, { content: text })
          : undefined;
      if (sent) setMessages((prev) => [...prev, sent]);
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not send the message.");
    }
  }

  /** §6.1 — up to 5 images per message; extra selections are dropped rather
   * than rejected outright, since the picker has no way to un-select some. */
  async function handleAttach(files: FileList) {
    if (!transaction && !giveaway) return;
    const selected = Array.from(files).slice(0, 5);
    if (files.length > 5) toast.warning(t("deal.photoLimit"));

    setBusy(true);
    try {
      const image_urls: string[] = [];
      for (const file of selected) {
        const formData = new FormData();
        formData.append("file", file);
        image_urls.push(await uploadChatImage(formData));
      }
      const sent = transaction
        ? await sendChatMessage(transaction.transaction_id, { image_urls })
        : await sendGiveawayMessage(giveaway!.giveaway_id, { image_urls });
      setMessages((prev) => [...prev, sent]);
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not send the photos.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePropose() {
    if (!transaction || !when) return;
    setBusy(true);
    try {
      const created = await proposeAppointment(transaction.transaction_id, {
        date: when.toString(),
        time,
        location: place,
      });
      setAppointment(created);
      setPlace("");
      setEditingAppointment(false);
      toast.success(t("deal.meetupProposed"));
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not propose a meetup.");
    } finally {
      setBusy(false);
    }
  }

  /** Pencil icon on the card, or "Edit" in the awaiting side's action row —
   * pre-fills the form from the card currently on screen so the resend below
   * replaces it in place instead of ever showing alongside it. */
  function startEditingAppointment() {
    if (!appointment) return;
    setPlace(appointment.location);
    setWhen(parseDate(appointment.date));
    setTime(appointment.time.slice(0, 5));
    setEditingAppointment(true);
  }

  /** No API call — the card already on screen is untouched local state, so
   * it simply reappears exactly as it was. */
  function cancelEditingAppointment() {
    setEditingAppointment(false);
  }

  async function handleAppointmentResponse(response: "confirm") {
    if (!appointment) return;
    setBusy(true);
    try {
      const updated = await respondToAppointment(appointment.appointment_id, response);
      setAppointment(updated);
      toast.success("Meetup confirmed");
    } catch (error) {
      toast.error((error as ApiError).message ?? "Could not respond to the meetup.");
    } finally {
      setBusy(false);
    }
  }

  function currentAction(): React.ReactNode {
    if (!transaction) return null;
    if (transaction.cancellation_response === "Pending") {
      const myId = viewer === "buyer" ? transaction.buyer_id : transaction.seller_id;
      return <ActionCard title="Cancellation / return request">
        <p>{transaction.cancellation_reason}</p>
        {transaction.cancellation_requested_by !== myId ? <div className="flex gap-3">
          <Button isLoading={busy} onPress={() => act(() => answerCancellation(transaction.transaction_id, "accept"), "Request accepted", "Could not respond")}>Accept</Button>
          <Button variant="danger" isLoading={busy} onPress={() => act(() => answerCancellation(transaction.transaction_id, "reject"), "Sent for review", "Could not respond")}>Reject</Button>
        </div> : <p>Waiting for the other party to respond.</p>}
      </ActionCard>;
    }
    if (transaction.active_report_id && transaction.cancellation_response === "Rejected") {
      return <ActionCard title="Under review"><p>Wait for the administrator to review this request.</p></ActionCard>;
    }
    if (transaction.status === "Pending Refund" || (transaction.status === "Cancelled" && transaction.payment_confirmed_by_buyer_at && !transaction.refund_confirmed_by_buyer)) {
      const myId = viewer === "buyer" ? transaction.buyer_id : transaction.seller_id;
      return <ActionCard title="Return and refund">
        <div className="flex flex-col gap-3">
          {transaction.payment_confirmed_by_buyer_at && !transaction.refund_confirmed_by_buyer ? (
            viewer === "seller" ? <SlipUploader amount={transaction.final_amount} onUpload={(file) => act(() => submitRefundSlip(transaction.transaction_id, file), "Refund slip uploaded", "Could not upload refund slip")} /> :
            transaction.refund_slip_url ? <Button isLoading={busy} onPress={() => act(() => confirmRefundReceived(transaction.transaction_id), "Refund receipt confirmed", "Could not confirm refund")}>Confirm money received</Button> : <p>Waiting for the refund slip.</p>
          ) : null}
          {transaction.item_received_confirmed_by_buyer_at && !transaction.item_return_confirmed_at ? (
            transaction.cancellation_requested_by === myId ? <LinkButton href={`/history/${transaction.transaction_id}/scan`}>Scan return QR after receiving the item</LinkButton> :
            <QrTicket once onGenerate={requestHandoverToken} ariaLabel="Item return QR" caption="One code per 15 minutes. Show it only when both parties are ready to return the goods." />
          ) : null}
        </div>
      </ActionCard>;
    }
    if (!isYourTurn) return null;

    switch (prompt?.action) {
      case "propose-appointment":
        // `lib/status.ts` emits this for a cash-free trade, and this switch
        // used to fall through to `default: return null`. The prompt said
        // "Your turn: propose a meetup" and the screen offered nothing —
        // the form for it lives in the appointment pin, which starts closed.
        return (
          <ActionCard title={t("deal.stepArrangeMeetup")}>
            <div className="flex flex-col gap-3">
              <p className="text-body text-ink-secondary">
                There is no money in this trade, so the next thing to settle is
                where and when you swap.
              </p>
              <Button
                block
                onPress={() => {
                  setPinOpen(true);
                  appointmentPinRef.current?.scrollIntoView({
                    block: "nearest",
                  });
                }}
              >
                <CalendarClock className="size-4" />{t("deal.proposeTimeAndPlace")}</Button>
            </div>
          </ActionCard>
        );
      case "upload-slip":
        return (
          <ActionCard title={t("deal.stepUploadSlip")}>
            <SlipUploader
              amount={transaction.final_amount}
              onUpload={(file) =>
                act(
                  () => submitPaymentSlip(transaction.transaction_id, file),
                  "Slip uploaded. Waiting on the seller.",
                  "Could not upload the slip",
                )
              }
            />
          </ActionCard>
        );
      case "review-slip":
        return transaction.slip_image_url &&
          transaction.payment_confirmed_by_buyer_at ? (
          <ActionCard title={t("deal.stepCheckSlip")}>
            <SlipReviewer
              slipUrl={transaction.slip_image_url}
              amount={transaction.final_amount}
              buyer={{
                name: transaction.buyer.name,
                isVerified: transaction.buyer.isVerified,
              }}
              uploadedAt={transaction.payment_confirmed_by_buyer_at}
              isBusy={busy}
              onConfirm={() =>
                act(
                  () => confirmSlip(transaction.transaction_id),
                  "Payment confirmed",
                  "Could not confirm the payment",
                )
              }
              // There is no reject endpoint. `API_Marketplace.pdf` gives the
              // seller `confirm-payment-received` and nothing else; the only
              // contract route out of a bad slip is a cancellation request,
              // and routing this button there is a product decision nobody has
              // taken. Until then it says so rather than reporting a rejection
              // that never reached the buyer. See docs/design/api-gaps.md.
              onReject={() =>
                toast.warning(
                  "Rejecting a slip is not supported yet. Ask the buyer in chat, or request a cancellation.",
                )
              }
            />
          </ActionCard>
        ) : null;
      case "enter-tracking":
        return (
          <ActionCard title={t("deal.stepEnterTracking")}>
            <div className="flex flex-col gap-3">
              <TextInput
                label={t("deal.trackingNumber")}
                value={tracking}
                onChange={setTracking}
                placeholder={t("deal.trackingPlaceholder")}
                icon={<Truck className="size-4" />}
                hint={t("deal.trackingHint")}
              />
              <TextInput label="Estimated delivery date" type="date" value={deliveryDate} onChange={setDeliveryDate} isRequired />
              <Button
                block
                isDisabled={!tracking.trim() || !deliveryDate}
                isLoading={busy}
                onPress={() =>
                  act(
                    () => saveTracking(transaction.transaction_id, tracking.trim(), deliveryDate),
                    "Tracking number saved",
                    "Could not save the tracking number",
                  )
                }
              >{t("deal.saveAndNotify")}</Button>
            </div>
          </ActionCard>
        );
      case "confirm-delivery":
        return (
          <ActionCard title={t("deal.stepConfirmArrived")}>
            <div className="flex flex-col gap-3">
              <p className="text-body text-ink-secondary">
                Did the parcel arrive and match what was agreed? Confirm to close
                this deal.
              </p>
              <Button
                block
                isLoading={busy}
                onPress={() =>
                  act(
                    () => confirmItemArrived(transaction.transaction_id),
                    "Deal closed",
                    "Could not confirm the delivery",
                  )
                }
              >{t("deal.confirmArrived")}</Button>
            </div>
          </ActionCard>
        );
      case "scan-qr":
        // §appointment loop fix — the handover cannot happen until the current
        // meetup is Confirmed. If it is not (no card yet, or a proposed change
        // was just declined), send the buyer to the appointment pin instead of
        // a scanner that the backend will reject.
        if (appointment?.status !== "Confirmed") {
          return (
            <ActionCard title={t("deal.stepArrangeMeetup")}>
              <div className="flex flex-col gap-3">
                <p className="text-body text-ink-secondary">
                  Agree and confirm a meetup time before the handover QR opens.
                </p>
                <Button
                  block
                  onPress={() => {
                    setPinOpen(true);
                    appointmentPinRef.current?.scrollIntoView({
                      block: "nearest",
                    });
                  }}
                >
                  <CalendarClock className="size-4" />
                  {t("deal.proposeTimeAndPlace")}
                </Button>
              </div>
            </ActionCard>
          );
        }
        return (
          <ActionCard title={t("deal.stepScanQr")}>
            <LinkButton
              block
              size="lg"
              href={`/history/${transaction.transaction_id}/scan`}
            >
              <ScanLine className="size-5" />{t("deal.openScanner")}</LinkButton>
          </ActionCard>
        );
      case "refund-slip":
        return (
          <ActionCard title={t("deal.stepRefundSlip")}>
            <SlipUploader
              amount={transaction.final_amount}
              onUpload={(file) =>
                act(
                  () => submitRefundSlip(transaction.transaction_id, file),
                  "Refund slip uploaded",
                  "Could not upload the refund slip",
                )
              }
            />
          </ActionCard>
        );
      case undefined:
        return null;
      default: {
        // Exhaustive: adding a PromptAction without a case here is a compile
        // error, not a screen that renders nothing on someone's turn.
        const unhandled: never = prompt!.action;
        return unhandled;
      }
    }
  }

  /**
   * The QR opens here, not on its own route.
   *
   * The owner's second complaint about these screens was that the appointment,
   * the QR and the slip live in different places — and they did: a collapsed
   * pin, a bottom bar, and two separate pages. The slip and the appointment
   * were already on this screen. This was the one that navigated away from the
   * deal in order to complete it.
   *
   * The buyer's scanner stays a route: it owns a camera stream, and a sheet is
   * the wrong container for that.
   */
  const sellerQr =
    transaction &&
    transaction.delivery_method === "Meetup" &&
    (transaction.status === "Processing" || (transaction.status === "Pending" && transaction.offer_id != null && !transaction.additional_money)) &&
    !transaction.cancellation_response &&
    // §appointment loop fix — the backend refuses a handover QR unless the
    // current appointment is Confirmed, so do not offer the button until it is.
    // Otherwise declining a proposed change ("Another time") left this button
    // live and pressing it threw a 500 through the server action.
    appointment?.status === "Confirmed" &&
    viewer === "seller" ? (
      <ActionCard title={t("deal.letBuyerScan")}>
        <OverlayTrigger>
          <Button block size="lg">
            <QrCode className="size-5" />{t("deal.showQr")}</Button>
          <Overlay
            title={t("deal.letBuyerScanTitle")}
            description={t("deal.letBuyerScanBody")}
            size="sm"
          >
            <div className="flex justify-center py-2">
              <QrTicket
                once
                onGenerate={requestHandoverToken}
                ariaLabel={`QR code for handing over ${transaction.post.item.name}`}
              />
            </div>
          </Overlay>
        </OverlayTrigger>
      </ActionCard>
    ) : null;

  return (
    /* A messenger, not a card. The room is the surface: it fills the column the
       shell gives it, and the only thing that scrolls is the thread. */
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-surface">
      {/* Header: who, what kind, what about. */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
        <Link
          href="/chat"
          aria-label={t("deal.backToConversations")}
          className="touch-target grid size-9 shrink-0 place-items-center rounded-pill text-ink-secondary hover:bg-gray-100 xl:hidden"
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
            <span className="shrink-0 rounded-chip bg-gray-100 px-1.5 py-0.5 text-meta font-semibold text-ink-secondary">{t("chat.giver")}</span>
          ) : null}

          {/* §7.5.2 — rude/threatening behavior, spam, or impersonation "in
              chat" is the spec's own framing for a User report, so the
              trigger lives right where that happens. */}
          <ReportDialog
            reportType="User"
            targetId={summary.counterparty.user_id}
            reasons={USER_REPORT_REASONS}
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                pill
                aria-label={`Report ${summary.counterparty.name}`}
              >
                <Flag className="size-3.5" />
              </Button>
            }
          />
        </span>

        <span className="ml-auto flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "shrink-0 rounded-chip border px-1.5 py-0.5 text-meta font-semibold",
              TONE_CHIP[ROOM_KIND_TONE[summary.kind]],
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
              className="min-w-0 truncate text-caption text-ink-brand hover:underline"
            >
              {summary.subject}
            </Link>
          ) : (
            <span className="min-w-0 truncate text-caption text-ink-muted">
              {summary.subject}
            </span>
          )}
        </span>
      </header>

    {/* The deal strip. This used to be the phone-only stand-in for a rail
        that covered desktop; with the rail gone it is the one summary at
        every width, and tapping it opens everything the rail used to hold. */}
    <div className="shrink-0 border-b border-line">
      <button
        type="button"
        onClick={() => setDetailToggled(!detailOpen)}
        aria-expanded={detailOpen}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
      >
        <span className="block w-11 shrink-0 overflow-hidden rounded-slot">
          <PostImage src={subjectImage} alt="" aspectRatio={1} sizes="44px" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-semibold">
            {summary.subject}
          </span>
          {/* PRODUCT.md principle 1: "whose turn is it — always answer,
              always first." resolveTransactionActor already produces exactly
              that sentence, in second person, and it was rendered inside
              DealDetails inside this accordion — which starts closed. What
              was visible instead was the delivery method and the amount:
              two facts the viewer already knows.

              The owner named not knowing whose turn it is twice, once as a
              fear and once as the worst thing about these screens. It is the
              most-supported finding in the project and the answer was one
              disclosure away. */}
          <span
            className={cn(
              "block truncate text-caption",
              isYourTurn ? "font-semibold text-ink" : "text-ink-muted",
            )}
          >
            {prompt
              ? st.key(prompt.labelKey)
              : giveaway
                ? `Collect at ${giveaway.pickup_location}`
                : null}
          </span>
        </span>

        {/* Was iconOnly, so the deal's state reached the collapsed strip as a
            wordless coloured dot. The sentence above says it in words now, so
            the badge is redundant here and stays in DealDetails. */}

        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-ink-muted transition-transform duration-[--dur-fast]",
            detailOpen && "rotate-180",
          )}
        />
      </button>

      {detailOpen ? (
        <div className="border-t border-line bg-surface-sunken/40 px-4 py-4">
          {transaction && viewer ? (
            <DealDetails
              transaction={transaction}
              viewer={viewer}
              appointment={appointment}
              counterpartyName={summary.counterparty.name}
              prompt={prompt}
              steps={steps}
              currentStepNumber={currentStepNumber}
              deadline={deadline}
              reportable={reportable}
              busy={busy}
              onCancel={(reason) =>
                act(
                  () => askToCancel(transaction.transaction_id, reason),
                  "Cancellation requested",
                  "Could not send the cancellation request",
                )
              }
            />
          ) : null}

          {giveaway ? (
            <GiveawayDetails
              giveaway={giveaway}
              entrants={entrants}
              viewerId={viewerId}
            />
          ) : null}
        </div>
      ) : null}
    </div>

      {/* Pinned like LINE pins a message: one line, expandable, always the
          first thing under the header. What it pins depends on how the item
          changes hands — a shipped deal has no appointment, so pinning one
          was showing information that does not exist. */}
      {transaction && viewer ? (
        <div
          ref={appointmentPinRef}
          className={cn(
            "border-b border-line",
            (transaction.delivery_method === "Meetup" || transaction.status === "Pending Refund")
              ? "bg-tone-success-bg/60"
              : "bg-tone-info-bg/60",
          )}
        >
          <button
            type="button"
            onClick={() => setPinOpen((v) => !v)}
            aria-expanded={pinOpen}
            className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-caption"
          >
            {(transaction.delivery_method === "Meetup" || transaction.status === "Pending Refund") ? (
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
                    : meetupBlockedOnPayment
                      ? t("deal.meetupWaitingOnPayment")
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
              {(transaction.delivery_method !== "Meetup" && transaction.status !== "Pending Refund") ? (
                <DeliveryCard transaction={transaction} viewer={viewer} />
              ) : appointment && editingAppointment ? (
                // Pre-filled from the card it replaces — "Resend" updates that
                // same card in place, "Discard" brings it back untouched.
                <ProposeMeetup
                  place={place}
                  onPlaceChange={setPlace}
                  when={when}
                  onWhenChange={setWhen}
                  time={time}
                  onTimeChange={setTime}
                  isBusy={busy}
                  onPropose={handlePropose}
                  submitLabel={t("deal.resendMeetup")}
                  onDiscard={cancelEditingAppointment}
                />
              ) : appointment ? (
                <AppointmentCard
                  status={appointment.status}
                  scheduledAt={`${appointment.date}T${appointment.time}+07:00`}
                  place={appointment.location}
                  // Only the side that did not propose it can answer it.
                  awaitingViewer={appointment.proposed_by !== viewerId}
                  onAccept={() => handleAppointmentResponse("confirm")}
                  onEdit={startEditingAppointment}
                />
              ) : meetupBlockedOnPayment ? (
                <p className="rounded-control border border-line bg-surface px-3.5 py-2.5 text-body-sm text-ink-secondary">
                  {t("deal.meetupPaymentNotice")}
                </p>
              ) : (
                /* Flow 1 puts the appointment after the payment is confirmed
                   and before the QR scan, and the API has a card to create.
                   With no row yet, the pin is where you make one. */
                <ProposeMeetup
                  place={place}
                  onPlaceChange={setPlace}
                  when={when}
                  onWhenChange={setWhen}
                  time={time}
                  onTimeChange={setTime}
                  isBusy={busy}
                  onPropose={handlePropose}
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
        onSend={handleSend}
        onAttach={handleAttach}
      />
    </div>
  );
}

/**
 * What the desktop rail used to hold, now behind the deal strip.
 *
 * The rail was a 288px column pinned beside the thread; at that width the
 * stepper had to run vertically and the whole thing competed with the
 * conversation for attention. As a disclosure it is the same content, opened
 * when it is wanted, and it works at 360px without a second layout.
 */
function DealDetails({
  transaction,
  viewer,
  appointment,
  counterpartyName,
  prompt,
  steps,
  currentStepNumber,
  deadline,
  reportable,
  busy,
  onCancel,
}: {
  transaction: Transaction;
  viewer: Party;
  appointment?: AppointmentCardData;
  counterpartyName: string;
  prompt?: ActorPrompt;
  steps: Step[];
  currentStepNumber: number;
  deadline?: Deadline;
  reportable: boolean;
  busy: boolean;
  onCancel: (reason: string) => void;
}) {
  const t = useTranslations();
  const st = useStatusText();
  // The reason was collected by an input bound to nothing and thrown away. A
  // rejected cancellation flips dispute_status to under_review immediately, so
  // this text is the only context the admin who picks it up will have.
  const [cancelReason, setCancelReason] = useState("");

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6">
      <div className="flex flex-col gap-3">
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
        </div>

        {prompt ? (
          <p
            className={cn(
              "rounded-control border px-3 py-2 text-body-sm font-medium",
              TONE_CHIP[prompt.tone],
            )}
          >
            {st.key(prompt.labelKey)}
          </p>
        ) : null}

        {transaction.delivery_method === "Shipping" ? (
          <DeliveryCard transaction={transaction} viewer={viewer} />
        ) : deadline ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-meta text-ink-muted">{st.key(deadline.labelKey)}</p>
            <CountdownPill deadline={deadline} />
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-line pt-3">
          {reportable ? (
            <LinkButton
              variant="secondary"
              size="sm"
              href={`/history/${transaction.transaction_id}/report`}
            >
              <Flag className="size-4" />{t("deal.reportProblem")}</LinkButton>
          ) : null}

          {transaction.status === "Pending" ||
          transaction.status === "Processing" || (transaction.status === "Completed" && !transaction.cancellation_requested_by) ? (
            <OverlayTrigger>
              <Button variant="ghost" size="sm">
                <XCircle className="size-4" />{transaction.status === "Completed" ? "Request return (within 7 days)" : t("deal.requestCancellation")}</Button>
              <Overlay
                isBusy={busy}
                title={transaction.status === "Completed" ? "Request a return" : t("deal.cancelTitle")}
                description={transaction.status === "Completed" ? "Explain the reason. The other party must respond before goods or money are returned." : t("deal.cancelBody")}
                footer={
                  <>
                    <Button variant="ghost" slot="close">{t("deal.keepDeal")}</Button>
                    <Button
                      variant="danger"
                      isLoading={busy}
                      isDisabled={!cancelReason.trim()}
                      onPress={() => onCancel(cancelReason.trim())}
                    >{t("deal.sendCancelRequest")}</Button>
                  </>
                }
              >
                <TextInput
                  label={t("deal.reason")}
                  value={cancelReason}
                  onChange={setCancelReason}
                  isRequired
                  placeholder={t("deal.reasonPlaceholder")}
                  hint={t("deal.reasonHint")}
                />
              </Overlay>
            </OverlayTrigger>
          ) : null}
        </div>
      </div>

      {/* A bare column of dots does not announce what it is measuring. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-overline text-ink-muted uppercase">{t("deal.progress")}</p>
          <p data-numeric className="text-meta text-ink-muted">
            Step {currentStepNumber} of {steps.length}
          </p>
        </div>
        <TransactionStepper
          transaction={transaction}
          appointmentStatus={appointment?.status}
          orientation="vertical"
          viewer={viewer}
          counterpartyName={counterpartyName}
        />
      </div>
    </div>
  );
}

/** The giveaway equivalent: what it is, where to collect, and who is here. */
function GiveawayDetails({
  giveaway,
  entrants,
  viewerId,
}: {
  giveaway: GiveawayPost;
  entrants?: Entrant[];
  viewerId: number;
}) {
  const t = useTranslations();
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-6">
      <div className="flex flex-col gap-2">
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
        <p className="flex items-start gap-2 text-caption leading-[1.6] text-ink-muted">
          <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Collect at {giveaway.pickup_location}
        </p>

        {/* Only a Manual giveaway has a manage screen — the route 404s for
            the other two, and this button sent every giver at it. */}
        {giveaway.giver_id === viewerId &&
        giveaway.allocation_method === "Manual" ? (
          <LinkButton
            size="sm"
            className="w-fit"
            href={`/giveaway/${giveaway.giveaway_id}/manage`}
          >{t("chat.chooseRecipients")}</LinkButton>
        ) : (
          <LinkButton
            variant="secondary"
            size="sm"
            className="w-fit"
            href={`/giveaway/${giveaway.giveaway_id}`}
          >{t("chat.openGiveaway")}</LinkButton>
        )}
      </div>

      {/* The rail listed the item and the pickup point and nobody at all,
          in the one kind of room that holds more than two people. */}
      {entrants?.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted uppercase">{t("chat.inThisRoom")}</p>

          <span className="flex items-center gap-2">
            <TrustBadge
              size="sm"
              name={giveaway.giver.name}
              isVerified={giveaway.giver.isVerified}
              avatarUrl={giveaway.giver.avatar_url}
            />
            <span className="ml-auto shrink-0 rounded-chip bg-gray-100 px-1.5 py-0.5 text-meta font-semibold text-ink-secondary">{t("chat.giver")}</span>
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
              className="text-caption font-medium text-ink-brand hover:underline"
            >
              {entrants.length - ROSTER_LIMIT} more
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
