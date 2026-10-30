"use client";

import { formatDate } from "@/lib/date-format";


import { getCopy } from "@/lib/copy";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronUp, ImagePlus, ReceiptText, Send } from "lucide-react";
import { Button as AriaButton } from "react-aria-components";

import type { UserSummary } from "@/lib/api/types";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Overlay } from "./overlay";
import { PhotoViewer, PhotoViewerTrigger } from "./photo-viewer";
import { ProfileLink } from "./profile-link";
import { TrustBadge } from "./trust-badge";

/**
 * The chat is the transaction (IA decision D1). Flow actions are not buried in
 * a menu or split onto their own routes — they appear as cards *in the thread*
 * at the moment they become available, so the conversation and the commitments
 * read as one timeline.
 *
 * `ActionCard` is the slot: SlipUploader, SlipReviewer, AppointmentCard, the
 * tracking-number form, and the QR launcher all render through it.
 */

/** True while the current step is rendered inside the narrow-screen sheet. */
const ActionInSheet = createContext(false);

/** `CreateMessageDto.content` is `@MaxLength(2000)` in the API. */
export const CHAT_MESSAGE_MAX = 2000;

/** The counter appears once this close to the limit, not on every message. */
const COUNTER_FROM = CHAT_MESSAGE_MAX - 200;

/** Tallest the composer grows before it scrolls, in px (about five lines). */
const COMPOSER_MAX_PX = 136;

export interface ChatMessage {
  message_id: number;
  sender_id: number;
  content?: string | null;
  image_urls?: string[] | null;
  /** §6.2 — past the 7-day display lifetime, `image_urls` is null and this
   * is true; shown as a notice instead of the (no longer sent) image grid. */
  images_expired?: boolean;
  created_at: string;
}

export interface ChatThreadProps {
  messages: ChatMessage[];
  viewerId: number;
  /** Rendered pinned to the end of the thread — the current flow action. */
  action?: React.ReactNode;
  /**
   * Cards placed by time among the messages — the deal's progress summaries.
   * Sorted by `placeAt` (epoch ms); each renders before the first message sent
   * after it, and `Infinity` puts one after the last message.
   */
  events?: Array<{ key: string; placeAt: number; node: React.ReactNode }>;
  /**
   * Cards interleaved by timestamp, e.g. accepted appointments. `0` is a
   * sentinel for "before the first message" — a real `message_id` is never
   * 0 — for a deal event that predates every message in the room (or a room
   * with no messages at all yet).
   */
  systemCards?: Array<{ afterMessageId: number; node: React.ReactNode }>;
  /** Resolving `false` means the send failed: the text goes back in the box. */
  onSend?: (text: string) => void | boolean | Promise<void | boolean>;
  onAttach?: (files: FileList) => void | Promise<void>;
  /** Giveaway rooms let only the giver type (flow 3). */
  isReadOnly?: boolean;
  readOnlyNotice?: string;
  /**
   * Who everyone is, by `sender_id`. Needed only when `showSenders` is on.
   */
  senders?: Map<number, UserSummary>;
  /**
   * Name other people's messages. Off for a one-to-one deal room, where the
   * only two possible senders are you and the person in the header. On for a
   * giveaway room, where several recipients share the thread and every bubble
   * that is not yours otherwise collapses into the same anonymous grey.
   */
  showSenders?: boolean;
  /**
   * Image URLs that are a receipt for this deal rather than a snapshot someone
   * attached — keyed by URL, valued with what to call it.
   *
   * A payment slip is posted into the thread when it is uploaded, because that
   * is where people look for it: the Thai habit is "transferred, here you go"
   * followed by the screenshot. But a slip is evidence and an ordinary photo is
   * not, so it must not look like one. Bubbles listed here get a label and the
   * slip's own proportions instead of a square crop.
   */
  receipts?: Map<string, string>;
  className?: string;
}

/** Calendar day in the campus timezone, so a message near midnight groups the
 * same way for everyone regardless of the reader's own device timezone. */
function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

/** "Today" / "Yesterday" / "Mon 10 Aug" — the pill between day groups. */
function dayLabel(iso: string): string {
  const key = dayKey(iso);
  if (key === dayKey(new Date().toISOString())) return "Today";
  if (key === dayKey(new Date(Date.now() - 86_400_000).toISOString()))
    return "Yesterday";
  return formatDate(new Date(iso));
}

/**
 * A slip in the thread, told apart from a snapshot.
 *
 * Square-cropping a bank screenshot is the worst possible thumbnail for it: the
 * crop lands on the middle of the receipt and cuts off both the amount at the
 * top and the reference at the bottom. This keeps the slip's own proportions,
 * names what it is, and opens the same full-screen viewer as everything else.
 */
function ReceiptBubble({ url, label }: { url: string; label: string }) {
  const t = getCopy();
  return (
    <PhotoViewerTrigger>
      <button
        type="button"
        aria-label={t("chat.viewFullSize")}
        className="block w-[min(15rem,60vw)] overflow-hidden rounded-card bg-surface shadow-raised"
      >
        <span className="flex items-center gap-1.5 px-3 py-2 text-meta font-semibold text-ink-brand">
          <ReceiptText aria-hidden className="size-3.5" />
          {label}
        </span>
        <Image
          src={url}
          alt=""
          width={480}
          height={640}
          className="max-h-64 w-full bg-surface-sunken object-contain"
        />
      </button>
      <PhotoViewer src={url} alt={label} title={label} />
    </PhotoViewerTrigger>
  );
}

export function ChatThread({
  messages,
  viewerId,
  action,
  events = [],
  systemCards = [],
  receipts,
  onSend,
  onAttach,
  isReadOnly = false,
  readOnlyNotice = "Only the giver can post in this room",
  senders,
  showSenders = false,
  className,
}: ChatThreadProps) {
  const t = getCopy();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * The flow action folds away. A scanner card is tall and there is no reason
   * to look at it while reading back through the conversation, so the toggle
   * lives in the composer beside the attach button.
   *
   * Wide screens show it as a panel above the composer, open by default — it is
   * the thing the deal is waiting on, and there is room for all of it. Narrow
   * screens show it as a bottom sheet instead, closed by default: a sheet that
   * opened on its own would cover the conversation the moment a room loaded.
   * The toggle is tinted while a step is folded away, so it is not lost. Once
   * the person has pressed the toggle, their choice wins over either default.
   */
  const isWide = useMediaQuery("(min-width: 1024px)");
  const [actionChoice, setActionChoice] = useState<boolean | null>(null);
  const actionOpen = actionChoice ?? isWide;
  const setActionOpen = (next: boolean) => setActionChoice(next);

  // Jump, don't animate: a smooth scroll on every incoming message fights the
  // user when they are reading back through the thread.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, events.length]);

  // Grow with the text up to a cap, then scroll inside. Measured from
  // scrollHeight after resetting, so deleting lines shrinks it again.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, [draft]);

  const canSend = draft.trim().length > 0;

  async function submit() {
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    const result = await onSend?.(value);
    // Keep what was typed if the send failed and nothing new was typed since.
    if (result === false) setDraft((current) => (current ? current : value));
  }

  const cardsByMessage = new Map(
    systemCards.map((c) => [c.afterMessageId, c.node]),
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-page/60 px-4 py-4">
        {/* `mt-auto` pins a short conversation to the bottom, against the
            composer, the way every messenger does. Without it a room with
            three messages hangs from the top of a tall column with the gap
            underneath, which reads as a document rather than a thread. */}
        <div className="mt-auto flex flex-col gap-3">
          {cardsByMessage.get(0) ?? null}

          {messages.map((m, i) => {
            const sentAt = Date.parse(m.created_at);
            const before = events.filter(
              (e) =>
                e.placeAt <= sentAt &&
                (i === 0 || e.placeAt > Date.parse(messages[i - 1].created_at)),
            );
            const mine = m.sender_id === viewerId;
            // Only the first message of a run gets the name — repeating it on
            // every bubble of a five-message burst is noise, not attribution.
            const startsRun = messages[i - 1]?.sender_id !== m.sender_id;
            const named = showSenders && !mine;
            const sender = named ? senders?.get(m.sender_id) : undefined;
            const startsNewDay =
              i === 0 ||
              dayKey(m.created_at) !== dayKey(messages[i - 1].created_at);
            // A receipt is posted on its own, one image and no text. A photo
            // that merely happens to repeat the URL inside a longer message
            // stays an ordinary attachment.
            const only = m.image_urls?.length === 1 ? m.image_urls[0] : undefined;
            const label = only ? receipts?.get(only) : undefined;
            const receipt = only && label ? { url: only, label } : undefined;

            // The day divider heads its day: deal events from that same day
            // (a "Deal started" a minute before the first message) go under
            // it, and only events from an earlier day stay above it.
            const sameDay = (e: (typeof before)[number]) =>
              dayKey(new Date(e.placeAt).toISOString()) === dayKey(m.created_at);
            const earlier = startsNewDay ? before.filter((e) => !sameDay(e)) : [];
            const onTheDay = startsNewDay ? before.filter(sameDay) : before;

            return (
              <div key={m.message_id} className="flex flex-col gap-3">
                {earlier.map((e) => (
                  <div key={e.key}>{e.node}</div>
                ))}
                {startsNewDay ? (
                  <div className="flex justify-center py-1">
                    <span className="rounded-pill bg-surface-sunken px-3 py-1 text-meta font-medium text-ink-muted">
                      {dayLabel(m.created_at)}
                    </span>
                  </div>
                ) : null}
                {onTheDay.map((e) => (
                  <div key={e.key}>{e.node}</div>
                ))}

                <div
                  className={cn(
                    "flex max-w-[82%] flex-col gap-1.5",
                    mine ? "self-end items-end" : "self-start items-start",
                    named && startsRun && i > 0 && "mt-2",
                  )}
                >
                  {named && startsRun ? (
                    <ProfileLink
                      userId={m.sender_id}
                      name={sender?.name ?? "this member"}
                    >
                      <TrustBadge
                        size="sm"
                        name={sender?.name ?? "Unknown member"}
                        isVerified={sender?.isVerified ?? false}
                        avatarUrl={sender?.avatar_url}
                        className="px-1"
                      />
                    </ProfileLink>
                  ) : null}

                  {m.images_expired ? (
                    <p className="rounded-control bg-surface-sunken px-3.5 py-2.5 text-caption text-ink-muted italic">{t("chat.photosExpired")}</p>
                  ) : receipt ? (
                    <ReceiptBubble url={receipt.url} label={receipt.label} />
                  ) : m.image_urls?.length ? (
                    <div
                      className={cn(
                        "grid gap-1.5",
                        m.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                      )}
                    >
                      {m.image_urls.slice(0, 5).map((url, idx, shown) => {
                        // An odd photo out takes the last row alone and sits on
                        // the sender's side, so no empty cell sits beside it.
                        const alone =
                          shown.length > 1 &&
                          shown.length % 2 === 1 &&
                          idx === shown.length - 1;
                        return (
                          <PhotoViewerTrigger key={url}>
                            <button
                              type="button"
                              aria-label={t("chat.viewFullSize")}
                              className={cn(
                                "block overflow-hidden rounded-control",
                                alone &&
                                  (mine
                                    ? "col-span-2 justify-self-end"
                                    : "col-span-2 justify-self-start"),
                              )}
                            >
                              <Image
                                src={url}
                                alt=""
                                width={220}
                                height={220}
                                className="aspect-square object-cover shadow-raised"
                              />
                            </button>
                            <PhotoViewer src={url} alt="" title={t("chat.photo")} />
                          </PhotoViewerTrigger>
                        );
                      })}
                    </div>
                  ) : null}

                  {m.content ? (
                    <p
                      className={cn(
                        // Line breaks typed in the composer survive.
                        "rounded-card px-3.5 py-2.5 text-body whitespace-pre-wrap break-words",
                        mine
                          ? // Body text needs 4.5:1; white on --brand is 4.04.
                            "rounded-br-chip bg-brand-strong text-on-brand-strong"
                          : // A white bubble on the near-white thread had no
                            // edge at all; the sunken tint gives the other
                            // side's message a shape without a border.
                            "rounded-bl-chip bg-surface-sunken text-ink",
                      )}
                    >
                      {m.content}
                    </p>
                  ) : null}

                  <time
                    dateTime={m.created_at}
                    className="px-1 text-meta text-ink-muted"
                  >
                    {new Date(m.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>

                {cardsByMessage.get(m.message_id) ?? null}
              </div>
            );
          })}

          {events
            .filter(
              (e) =>
                messages.length === 0 ||
                e.placeAt > Date.parse(messages[messages.length - 1].created_at),
            )
            .map((e) => (
              <div key={e.key}>{e.node}</div>
            ))}

          <div ref={endRef} />
        </div>
      </div>

      {/* Attached above the composer, outside the scroll region, so the step
          the deal is waiting on cannot scroll out from under its own toggle.
          Read-only rooms have no composer and so no toggle — the action stays
          open there rather than becoming unreachable.

          Wide screens let the panel take the height its content needs; it only
          scrolls when the window is too short to leave a strip of thread. On a
          narrow screen the step is a bottom sheet (below), except in a
          read-only room, which has no toggle to open one. */}
      {action && (isReadOnly || (isWide && actionOpen)) ? (
        <div className="min-h-0 max-h-[calc(100%-9rem)] shrink-0 overflow-y-auto overscroll-contain">
          {action}
        </div>
      ) : null}

      {action && !isReadOnly && !isWide ? (
        <Overlay
          variant="sheet"
          isOpen={actionOpen}
          onOpenChange={setActionOpen}
          title={t("chat.currentStep")}
          bodyClassName="px-0"
        >
          <ActionInSheet.Provider value>{action}</ActionInSheet.Provider>
        </Overlay>
      ) : null}

      {action && !isReadOnly ? (
        /* The toggle is a tab standing on the top edge of the composer, in
           a row of its own: floating over the thread it would hide the last
           message, which sits flush against the composer. The row takes the
           colour of whatever is above it (the thread, or the open panel) so
           the tab reads as growing out of the bar. */
        <div
          className={cn(
            "flex h-7 shrink-0 items-end justify-center",
            isWide && actionOpen ? "bg-brand-subtle/30" : "bg-page/60",
          )}
        >
          <AriaButton
            aria-expanded={actionOpen}
            aria-label={
              actionOpen ? "Hide the current step" : "Show the current step"
            }
            onPress={() => setActionOpen(!actionOpen)}
            className={cn(
              // -mb-px sits the tab over the bar's top rule, so the two join.
              // The pseudo-element lifts the touch target to 44px.
              "relative -mb-px grid h-7 w-14 place-items-center rounded-t-control border border-b-0 border-line text-ink-secondary",
              "before:absolute before:-inset-x-2 before:-top-4 before:bottom-0 before:content-['']",
              "transition-colors duration-[--dur-fast] hover:text-ink",
              // Green while the step is open, plain while it is folded away.
              actionOpen ? "bg-brand-subtle text-ink-brand" : "bg-surface",
            )}
          >
            <ChevronUp
              aria-hidden
              className={cn(
                "size-5 transition-transform duration-[--dur-fast]",
                actionOpen && "rotate-180",
              )}
            />
          </AriaButton>
        </div>
      ) : null}

      {isReadOnly ? (
        <p className="shrink-0 border-t border-line px-4 py-3 text-center text-caption text-ink-muted">
          {readOnlyNotice}
        </p>
      ) : (
        <form
          className="flex shrink-0 items-end gap-2 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            pill
            aria-label={t("chat.attachImages")}
            onPress={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-5" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            aria-label={t("chat.attachImages")}
            onChange={(e) => {
              if (e.target.files?.length) void onAttach?.(e.target.files);
            }}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={CHAT_MESSAGE_MAX}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends and Shift+Enter breaks the line, on a keyboard.
                // A touch keyboard's return key keeps adding lines — the Send
                // button is right there — and an IME confirming a word (Thai
                // input) must never send half a message.
                if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                if (window.matchMedia("(pointer: coarse)").matches) return;
                e.preventDefault();
                void submit();
              }}
              aria-label={t("chat.message")}
              aria-describedby={draft.length >= COUNTER_FROM ? "chat-char-count" : undefined}
              placeholder={t("chat.writeMessage")}
              className="block min-h-11 w-full resize-none rounded-card bg-surface-sunken px-4 py-2.5 text-body leading-6 shadow-sunken"
            />
            {draft.length >= COUNTER_FROM ? (
              <p
                id="chat-char-count"
                aria-live="polite"
                data-numeric
                className={cn(
                  "px-3 text-meta",
                  draft.length >= CHAT_MESSAGE_MAX ? "text-tone-danger-fg" : "text-ink-muted",
                )}
              >
                {t("chat.charCount", { count: draft.length, max: CHAT_MESSAGE_MAX })}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            size="icon"
            pill
            aria-label={t("chat.send")}
            isDisabled={!canSend}
          >
            <Send className="size-5" />
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * The slot a flow action occupies, attached to the top of the composer.
 *
 * It used to be a floating card inside the scroll region — rounded, shadowed,
 * ringed — which meant the thing the deal was waiting on scrolled away with the
 * messages, and the toggle in the composer controlled something you could not
 * see. It is now a bar fixed to the bottom of the room: full width, square, no
 * shadow, separated from the thread by a single rule.
 */
export function ActionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  // Inside the bottom sheet the sheet is the surface; the bar's rule and tint
  // would draw a second panel within it.
  const inSheet = useContext(ActionInSheet);
  return (
    <section
      className={cn(!inSheet && "border-t border-line bg-brand-subtle/30", className)}
      aria-label={title}
    >
      {/* This is the single most important sentence on the deal screen — the
          thing the viewer has to do next — and it was set at the smallest size
          in the scale, in caps, with 0.09em tracking. Overline is for a label
          above a group, not for an instruction. */}
      <h4 className="px-4 pt-3 text-body font-semibold text-ink">{title}</h4>
      <div className="px-4 pt-2 pb-3">{children}</div>
    </section>
  );
}
