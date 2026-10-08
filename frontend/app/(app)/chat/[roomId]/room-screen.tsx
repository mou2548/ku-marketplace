"use client";

import { formatDateTime } from "@/lib/date-format";


import { getCopy } from "@/lib/copy";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getLocalTimeZone, parseDate, today, type DateValue } from "@internationalized/date";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  Flag,
  Info,
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
import { ProfileLink } from "@/components/kit/profile-link";
import { ReportUserDialog } from "@/components/kit/report-user-dialog";
import { SlipReviewer, SlipUploader, SlipViewer } from "@/components/kit/slip";
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
  fetchTransaction,
  saveTracking,
  submitPaymentSlip,
  submitRefundSlip,
} from "@/lib/actions/transactions";
import { TONE_CHIP, TONE_DOT, TONE_TEXT } from "@/components/kit/tone";
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
import { useStatusText } from "@/lib/status-text";
import { markRoomActive } from "@/lib/chat-activity";
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
import { describeDeal } from "@/lib/deal-progress";
import { buildDealTimeline, type DealEvent } from "@/lib/deal-timeline";
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
  transactionStatusPresentation,
  type ActorPrompt,
  type Deadline,
  type Party,
  type Tone,
} from "@/lib/status";
import { usePolling } from "@/lib/use-polling";
import { cn } from "@/lib/utils";

/** Past this many, the rail sends the giver to the manage screen instead. */
const ROSTER_LIMIT = 5;

/** No realtime transport exists — a short poll keeps the thread from going
 * stale instead. See lib/use-polling.ts. */
const CHAT_POLL_INTERVAL_MS = 5000;

/** §7.5.2 — the system-provided reasons for a user report. */
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
  const t = getCopy();
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
  transaction: initialTransaction,
  giveaway,
  appointment: initialAppointment,
  appointmentCards: initialAppointmentCards,
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
  /** Every card on the deal, retired ones included — feeds the progress
   * summaries in the thread. */
  appointmentCards?: AppointmentCardData[];
  /** Everyone in a giveaway room. See docs/design/api-gaps.md. */
  entrants?: Entrant[];
  messages: ChatMessage[];
}) {
  const t = getCopy();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [tracking, setTracking] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [place, setPlace] = useState("");
  const [when, setWhen] = useState<DateValue | null>(null);
  const [time, setTime] = useState("12:00");
  const [busy, setBusy] = useState(false);
  /** Toggles the pin between showing the current AppointmentCard and showing
   * the pre-filled edit form for it — never both, which is what used to make
   * an edited appointment look like it had split into two cards. */
  const [editingAppointment, setEditingAppointment] = useState(false);
  /**
   * The deal's details — status, slip, meetup, stepper, cancellation — open in
   * a pop-up, the same way the slip and the QR do. They used to be two
   * disclosures fixed above the thread that squeezed the conversation.
   */
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Real messages refresh on a poll (no realtime transport exists) — for
  // either a transaction room or a giveaway group room. Appointments are a
  // transaction-only concept.
  const [messages, setMessages] = useState(initialMessages);
  const [appointment, setAppointment] = useState(initialAppointment);
  const [appointmentCards, setAppointmentCards] = useState(
    initialAppointmentCards ?? [],
  );
  // The transaction itself also has to poll, not just messages and
  // appointments — the stepper, the prompt, every `describeDeal`/
  // `buildDealTimeline` card, and `sellerQr`'s own visibility all read from
  // this object. Without polling it, only the party who just clicked
  // something saw it change (their own `act()` calls `router.refresh()`);
  // the other side saw nothing update — including no "payment confirmed"
  // card — until they reloaded the page by hand.
  const [transaction, setTransaction] = useState(initialTransaction);

  usePolling(() => {
    if (transaction) {
      const transactionId = transaction.transaction_id;
      fetchChatHistory(transactionId).then(setMessages).catch(() => {});
      fetchAppointmentCards(transactionId)
        .then((cards) => {
          const { pinned, pending } = deriveAppointmentView(cards);
          setAppointment(pending ?? pinned);
          setAppointmentCards(cards);
        })
        .catch(() => {});
      fetchTransaction(transactionId).then(setTransaction).catch(() => {});
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
  /* The one "where does this deal stand" sentence, shared with the inbox row
     and the latest progress card. It knows about the appointment, which
     `resolveTransactionActor` does not — that one still says "scan the QR"
     before any meetup exists. */
  const progress = transaction
    ? describeDeal(transaction, viewerId, appointmentCards)
    : undefined;
  const timeline = transaction
    ? buildDealTimeline(transaction, appointmentCards, viewerId)
    : [];
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

  /**
   * Every transition on this screen goes through here. It used to be a 400ms
   * timer that toasted success, which is why the stepper — derived from the
   * transaction's timestamp columns — could never advance.
   *
   * `router.refresh()` re-runs the server component that fetched the
   * transaction, so the stepper, the prompt and the pinned card all move on
   * the answer rather than on the toast.
   *
   * Returns whether `call` succeeded, so a caller that owns its own dialog
   * (e.g. the cancellation request below) can close it on success and leave
   * it open — with the toast's error still visible — on failure.
   */
  async function act(
    call: () => Promise<unknown>,
    message: string,
    failure: string,
    next?: string,
  ): Promise<boolean> {
    setBusy(true);
    try {
      await call();
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : failure);
      return false;
    }
    setBusy(false);
    toast.success(message);
    // Every status-changing control on this screen routes through `act`, so
    // this one line is what makes approving a slip, entering a tracking
    // number, answering a cancellation and confirming a handover float the
    // room the way sending a message already did. The poll then replaces the
    // local stamp with the derived `lastActivityAt` from the server.
    markRoomActive(summary.room_id);
    if (next) {
      router.push(next);
    } else if (pathname !== `/chat/${summary.room_id}`) {
      // The inbox preview is selected by queue priority, which changes after
      // accepting a payment. Keep this conversation instead of picking again.
      router.replace(`/chat/${summary.room_id}`);
    } else {
      router.refresh();
    }
    return true;
  }

  /**
   * `act()` swallows its own errors (shows a toast, does not rethrow) — fine
   * for every other control here, which has no further use for the failure.
   * `SlipUploader` (`slip.tsx`) is different: its own `send()` awaits
   * `onUpload` and depends on the rejection to keep the pending file and
   * show its own inline "try again" state instead of clearing the preview.
   * Routing the slip upload through `act()` meant that state never fired —
   * every failed upload (a real backend error, a dropped connection, an
   * expired session) still showed "Slip sent" with the preview intact, since
   * `act()` had already turned the rejection into a toast and a normal
   * return before `SlipUploader` ever saw it.
   */
  async function uploadAndRefresh(call: () => Promise<unknown>, message: string) {
    await call();
    toast.success(message);
    markRoomActive(summary.room_id);
    if (pathname !== `/chat/${summary.room_id}`) {
      router.replace(`/chat/${summary.room_id}`);
    } else {
      router.refresh();
    }
  }

  /**
   * Uploading a slip also drops it into the conversation.
   *
   * The deal panel is the record, but nobody looks there first: the habit this
   * app is replacing is "transferred, here you go" followed by the screenshot,
   * in the chat. Posting it means the other party sees it arrive in the place
   * they are already reading, and it stays scrollable in the timeline next to
   * the message that explains it.
   */
  // Left to the compiler rather than a useMemo: the deps here are optional
  // chains off `transaction`, which react-hooks/preserve-manual-memoization
  // cannot match up, and it flags the hook instead of keeping it.
  const receipts = new Map<string, string>();
  if (transaction?.slip_image_url)
    receipts.set(transaction.slip_image_url, t("slip.paymentSlipOnFile"));
  if (transaction?.refund_slip_url)
    receipts.set(transaction.refund_slip_url, t("slip.refundSlip"));

  async function uploadSlip(kind: "payment" | "refund", file: File) {
    if (!transaction) return;
    const updated =
      kind === "payment"
        ? await submitPaymentSlip(transaction.transaction_id, file)
        : await submitRefundSlip(transaction.transaction_id, file);

    const url =
      kind === "payment" ? updated.slip_image_url : updated.refund_slip_url;
    if (!url) return updated;

    try {
      const posted = await sendChatMessage(transaction.transaction_id, {
        image_urls: [url],
      });
      setMessages((prev) => [...prev, posted]);
    } catch {
      // The transaction already holds the slip and the deal panel renders it,
      // so the bubble is a convenience and never the record. A chat failure
      // must not turn a payment that went through into one that reads as
      // failed.
    }
    return updated;
  }

  async function handleSend(text: string) {
    try {
      const sent = transaction
        ? await sendChatMessage(transaction.transaction_id, { content: text })
        : giveaway
          ? await sendGiveawayMessage(giveaway.giveaway_id, { content: text })
          : undefined;
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        // Float this room to the top of the inbox now, not on the next poll.
        markRoomActive(summary.room_id);
      }
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
      markRoomActive(summary.room_id);
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
      setAppointmentCards((prev) => [...prev, created]);
      setPlace("");
      setEditingAppointment(false);
      markRoomActive(summary.room_id);
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
      setAppointmentCards((prev) =>
        prev.map((c) => (c.appointment_id === updated.appointment_id ? updated : c)),
      );
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
    // An open report locks every step (the API refuses them), whatever
    // sent the deal to the report flow.
    if (transaction.active_report_id) {
      return (
        <ActionCard title="Under admin review">
          <p>
            {transaction.cancellation_response === "Rejected"
              ? "The cancellation request is with an admin."
              : "A step ran out of time, so the deal went to an admin."}{" "}
            Nothing can be confirmed until they decide; you will be told the
            outcome here.
          </p>
        </ActionCard>
      );
    }
    if (transaction.status === "Pending Refund" || (transaction.status === "Cancelled" && transaction.payment_confirmed_by_buyer_at && !transaction.refund_confirmed_by_buyer)) {
      const myId = viewer === "buyer" ? transaction.buyer_id : transaction.seller_id;
      return <ActionCard title="Return and refund">
        <div className="flex flex-col gap-3">
          {transaction.payment_confirmed_by_buyer_at && !transaction.refund_confirmed_by_buyer ? (
            viewer === "seller" ? <SlipUploader amount={transaction.final_amount} title={t("slip.refundSlip")} slipUrl={transaction.refund_slip_url} isUploaded={!!transaction.refund_slip_url} uploadedAt={transaction.refund_submitted_at} onUpload={(file) => uploadAndRefresh(() => uploadSlip("refund", file), "Refund slip uploaded")} /> :
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
                onPress={() => setDetailsOpen(true)}
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
              slipUrl={transaction.slip_image_url}
              isUploaded={!!transaction.slip_image_url}
              uploadedAt={transaction.payment_confirmed_by_buyer_at}
              onUpload={(file) =>
                uploadAndRefresh(
                  () => uploadSlip("payment", file),
                  "Slip uploaded. Waiting on the seller.",
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
                  onPress={() => setDetailsOpen(true)}
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
              title={t("slip.refundSlip")}
              slipUrl={transaction.refund_slip_url}
              isUploaded={!!transaction.refund_slip_url}
              uploadedAt={transaction.refund_submitted_at}
              onUpload={async (file) => {
                await act(
                  () => uploadSlip("refund", file),
                  "Refund slip uploaded",
                  "Could not upload the refund slip",
                );
              }}
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

  const stepAction = currentAction() ?? sellerQr;

  /*
   * A slip is posted into the thread as a labelled receipt when it is
   * uploaded, so a "sent the slip" line beside it says the same thing twice.
   * The line stays only when the post never made it into the chat.
   */
  const postedImages = new Set(
    messages.flatMap((m) => (m.image_urls?.length === 1 ? m.image_urls : [])),
  );
  const shownEvents = timeline.filter(
    (e) =>
      !(e.kind === "slip" && transaction?.slip_image_url && postedImages.has(transaction.slip_image_url)) &&
      !(e.kind === "refund-slip" && transaction?.refund_slip_url && postedImages.has(transaction.refund_slip_url)),
  );
  // Where the status card goes: straight after the latest step, merged or not.
  const statusAt = timeline.length ? timeline[timeline.length - 1].placeAt : 0;
  /* The dots only describe the normal flow; a cancellation, return or review
     is its own path and is told in words instead. */
  const onMainPath =
    !!transaction &&
    !transaction.active_report_id &&
    transaction.cancellation_response !== "Pending" &&
    (transaction.status === "Pending" ||
      transaction.status === "Processing" ||
      transaction.status === "Completed");
  const progressEvents = transaction
    ? [
        ...shownEvents.map((event) => ({
          key: event.id,
          placeAt: event.placeAt,
          node: <DealEventCard event={event} />,
        })),
        {
          key: "status",
          placeAt: statusAt,
          node: (
            <StatusCard
              steps={onMainPath ? steps : []}
              // "Your step" below already says it when the viewer can act —
              // but off the main path there are no dots, and the card must
              // never be left saying nothing.
              headline={stepAction && onMainPath ? undefined : progress?.headline}
              tone={progress?.tone ?? "info"}
              onOpenDetails={() => setDetailsOpen(true)}
            />
          ),
        },
      ]
    : [];

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
          <ProfileLink
            userId={summary.counterparty.user_id}
            name={summary.counterparty.name}
          >
            <TrustBadge
              name={summary.counterparty.name}
              isVerified={summary.counterparty.isVerified}
              faculty={summary.counterparty.faculty}
              avatarUrl={summary.counterparty.avatar_url}
              size="sm"
            />
          </ProfileLink>
          {isGroupRoom ? (
            <span className="shrink-0 rounded-chip bg-gray-100 px-1.5 py-0.5 text-meta font-semibold text-ink-secondary">{t("chat.giver")}</span>
          ) : null}

          {/* §7.5.2 — rude/threatening behavior, spam, or impersonation "in
              chat" is the spec's own framing for a User report, so the
              trigger lives right where that happens. */}
          <ReportUserDialog
            userId={summary.counterparty.user_id}
            name={summary.counterparty.name}
            compact
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
          {transaction || giveaway ? (
            <Button
              variant="secondary"
              size="sm"
              pill
              aria-label={giveaway ? "Giveaway details" : "Deal details"}
              className="shrink-0 max-sm:w-9 max-sm:px-0"
              onPress={() => setDetailsOpen(true)}
            >
              <Info aria-hidden className="size-4" />
              <span className="max-sm:hidden">Details</span>
            </Button>
          ) : null}
        </span>
      </header>

      <ChatThread
        messages={messages}
        viewerId={viewerId}
        receipts={receipts}
        senders={senders}
        showSenders={isGroupRoom}
        action={stepAction}
        events={progressEvents}
        isReadOnly={giveawayReadOnly}
        readOnlyNotice="Only the giver can post here. Ask questions in person at pickup."
        onSend={handleSend}
        onAttach={handleAttach}
      />

      {/* Everything the deal strip and the appointment pin used to hold,
          opened on demand from the header or from any progress card. */}
      <Overlay
        isOpen={detailsOpen}
        onOpenChange={setDetailsOpen}
        title={giveaway ? "Giveaway details" : "Deal details"}
        size="lg"
      >
        <div className="flex flex-col gap-5">
          {transaction && viewer ? (
            <section aria-label="Handover" className="flex flex-col gap-3">
              {transaction.active_report_id ? (
                <p className="rounded-control border border-tone-danger-border bg-tone-danger-bg px-3.5 py-2.5 text-body-sm text-tone-danger-fg">
                  An admin is reviewing this deal. Meetups, payments and
                  handover are paused until they decide.
                </p>
              ) : (transaction.delivery_method !== "Meetup" && transaction.status !== "Pending Refund") ? (
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
            </section>
          ) : null}
          {transaction && viewer ? (
            <DealDetails
              transaction={transaction}
              viewer={viewer}
              appointment={appointment}
              counterpartyName={summary.counterparty.name}
              headline={progress?.headline}
              headlineTone={progress?.tone}
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
      </Overlay>
    </div>
  );
}

/**
 * The one card in the thread: where the deal stands now. Dots for the normal
 * flow, and the waiting-on sentence only when the viewer has nothing to do —
 * when they do, the "Your step" card under the thread already says it.
 */
function StatusCard({
  steps,
  headline,
  tone,
  onOpenDetails,
}: {
  steps: Step[];
  headline?: string;
  tone: Tone;
  onOpenDetails: () => void;
}) {
  const current = steps.findIndex((s) => s.current);
  const label =
    current === -1 ? undefined : `Step ${current + 1} of ${steps.length}: ${steps[current].label}`;

  return (
    <article
      aria-label="Deal status"
      className="mx-auto flex w-full max-w-md flex-col gap-2 rounded-card bg-surface px-4 py-3 shadow-raised"
    >
      {steps.length ? (
        <div className="flex flex-col gap-1.5">
          <ol aria-label={label ?? "All steps done"} className="flex items-center">
            {steps.map((step, i) => (
              <li key={step.id} className={cn("flex items-center", i > 0 && "flex-1")}>
                {i > 0 ? (
                  <span
                    aria-hidden
                    className={cn("h-0.5 flex-1", step.done || step.current ? TONE_DOT.success : "bg-gray-200")}
                  />
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    "block shrink-0 rounded-full",
                    step.current
                      ? "size-3 bg-brand ring-4 ring-brand-subtle"
                      : cn("size-2", step.done ? TONE_DOT.success : "bg-gray-200"),
                  )}
                />
              </li>
            ))}
          </ol>
          {label ? (
            <p className="text-[1.125rem] font-semibold text-ink">{label}</p>
          ) : null}
        </div>
      ) : null}

      {headline ? (
        <p className={cn("text-[1.125rem] font-medium", TONE_TEXT[tone])}>{headline}</p>
      ) : null}

      <button
        type="button"
        onClick={onOpenDetails}
        className="self-start text-[1.125rem] font-medium text-ink-brand hover:underline"
      >
        View details
      </button>
    </article>
  );
}

/**
 * One entry from `buildDealTimeline`, rendered as a centered system card —
 * the same visual register as the day-divider pill in `ChatThread`, since
 * this reports what the deal did, not what either party said.
 */
function DealEventCard({ event }: { event: DealEvent }) {
  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "flex max-w-[90%] items-start gap-3 rounded-control border px-3 py-2 text-caption",
          TONE_CHIP[event.tone],
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium">{event.title}</p>
          {event.detail ? (
            <p className="mt-0.5 text-ink-muted">{event.detail}</p>
          ) : null}
        </div>
        {event.at ? (
          <time
            dateTime={event.at}
            className="shrink-0 text-meta text-ink-muted"
          >
            {formatDateTime(event.at)}
          </time>
        ) : null}
      </div>
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
  headline,
  headlineTone,
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
  /** From `describeDeal`, so it matches the progress card and inbox row. */
  headline?: string;
  headlineTone?: Tone;
  steps: Step[];
  currentStepNumber: number;
  deadline?: Deadline;
  reportable: boolean;
  busy: boolean;
  onCancel: (reason: string) => Promise<boolean>;
}) {
  const t = getCopy();
  const st = useStatusText();
  // The reason was collected by an input bound to nothing and thrown away. A
  // rejected cancellation flips dispute_status to under_review immediately, so
  // this text is the only context the admin who picks it up will have.
  const [cancelReason, setCancelReason] = useState("");
  // Controlled rather than `OverlayTrigger`'s own uncontrolled open state,
  // because closing on success has to wait for `onCancel` to resolve — an
  // uncontrolled dialog has no "close only if this succeeded" hook, which is
  // exactly why this one used to stay open (looking stuck) after a
  // successful submit.
  const [cancelOpen, setCancelOpen] = useState(false);

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
            status={transactionStatusPresentation(transaction)}
            size="sm"
            className="w-fit"
          />
        </div>

        {headline ? (
          <p
            className={cn(
              "rounded-control border px-3 py-2 text-body-sm font-medium",
              TONE_CHIP[headlineTone ?? "info"],
            )}
          >
            {headline}
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

        {/*
          The receipt for money that moved off-platform, kept reachable by both
          parties for the life of the deal.

          The action cards render a slip too, but only while the prompt asks
          for one and only for whoever's turn it is — so the buyer lost sight
          of the slip the instant they sent it, and both parties lost it for
          good once the seller confirmed. Nothing here is gated on turn or on
          status: Completed, Cancelled and under-review deals all still answer
          "show me what was transferred".
        */}
        {transaction.slip_image_url ? (
          <SlipViewer
            slipUrl={transaction.slip_image_url}
            title={t("slip.paymentSlipOnFile")}
            amount={transaction.final_amount}
            uploadedAt={transaction.payment_confirmed_by_buyer_at}
          />
        ) : null}

        {transaction.refund_slip_url ? (
          <SlipViewer
            slipUrl={transaction.refund_slip_url}
            title={t("slip.refundSlip")}
            amount={transaction.final_amount}
            uploadedAt={transaction.refund_submitted_at}
          />
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

          {!transaction.active_report_id &&
          (transaction.status === "Pending" ||
          transaction.status === "Processing" || (transaction.status === "Completed" && !transaction.cancellation_requested_by)) ? (
            <>
              <Button variant="ghost" size="sm" onPress={() => setCancelOpen(true)}>
                <XCircle className="size-4" />{transaction.status === "Completed" ? "Request return (within 7 days)" : t("deal.requestCancellation")}</Button>
              <Overlay
                isOpen={cancelOpen}
                onOpenChange={setCancelOpen}
                isBusy={busy}
                title={transaction.status === "Completed" ? "Request a return" : t("deal.cancelTitle")}
                description={transaction.status === "Completed" ? "Explain the reason. The other party must respond before goods or money are returned." : t("deal.cancelBody")}
                footer={
                  <>
                    <Button variant="ghost" slot="close" isDisabled={busy}>{t("deal.keepDeal")}</Button>
                    <Button
                      variant="danger"
                      isLoading={busy}
                      isDisabled={!cancelReason.trim()}
                      onPress={async () => {
                        const ok = await onCancel(cancelReason.trim());
                        if (ok) setCancelOpen(false);
                      }}
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
            </>
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
  const t = getCopy();
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
            <ProfileLink userId={giveaway.giver.user_id} name={giveaway.giver.name}>
              <TrustBadge
                size="sm"
                name={giveaway.giver.name}
                isVerified={giveaway.giver.isVerified}
                avatarUrl={giveaway.giver.avatar_url}
              />
            </ProfileLink>
            <span className="ml-auto shrink-0 rounded-chip bg-gray-100 px-1.5 py-0.5 text-meta font-semibold text-ink-secondary">{t("chat.giver")}</span>
          </span>

          <ul className="flex flex-col gap-2">
            {entrants.slice(0, ROSTER_LIMIT).map((e) => (
              <li key={e.receiver_id} className="flex items-center gap-2">
                <ProfileLink userId={e.user.user_id} name={e.user.name}>
                  <TrustBadge
                    size="sm"
                    name={e.user.name}
                    isVerified={e.user.isVerified}
                    avatarUrl={e.user.avatar_url}
                  />
                </ProfileLink>
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
