"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronUp, ImagePlus, ReceiptText, Send } from "lucide-react";

import type { UserSummary } from "@/lib/api/types";
import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { PhotoViewer, PhotoViewerTrigger } from "./photo-viewer";
import { TONE_RAIL_LEFT } from "./tone";
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
  /** Cards interleaved by timestamp, e.g. accepted appointments. */
  systemCards?: Array<{ afterMessageId: number; node: React.ReactNode }>;
  onSend?: (text: string) => void | Promise<void>;
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

/**
 * A stable colour per person so a run of messages is separable while scrolling
 * past it. Decorative and always paired with the name — `danger` and `success`
 * are excluded so an accent can never be read as a status.
 */
const SENDER_TONES: Tone[] = ["info", "trade", "warning", "neutral"];

function senderTone(senderId: number): Tone {
  return SENDER_TONES[Math.abs(senderId) % SENDER_TONES.length];
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
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
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
  const t = useTranslations();
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
  const t = useTranslations();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * The flow action folds away. It sits at the end of the thread where it
   * belongs, but a scanner card is tall and there is no reason to look at it
   * while reading back through the conversation. Open by default — it is the
   * thing the deal is waiting on — and the toggle lives in the composer beside
   * the attach button, so it is reachable without scrolling to the card.
   */
  const [actionOpen, setActionOpen] = useState(true);

  // Jump, don't animate: a smooth scroll on every incoming message fights the
  // user when they are reading back through the thread.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

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
          {messages.map((m, i) => {
            const mine = m.sender_id === viewerId;
            // Only the first message of a run gets the name — repeating it on
            // every bubble of a five-message burst is noise, not attribution.
            const startsRun = messages[i - 1]?.sender_id !== m.sender_id;
            const named = showSenders && !mine;
            const sender = named ? senders?.get(m.sender_id) : undefined;
            const tone = senderTone(m.sender_id);
            const startsNewDay =
              i === 0 ||
              dayKey(m.created_at) !== dayKey(messages[i - 1].created_at);
            // A receipt is posted on its own, one image and no text. A photo
            // that merely happens to repeat the URL inside a longer message
            // stays an ordinary attachment.
            const only = m.image_urls?.length === 1 ? m.image_urls[0] : undefined;
            const label = only ? receipts?.get(only) : undefined;
            const receipt = only && label ? { url: only, label } : undefined;

            return (
              <div key={m.message_id} className="flex flex-col gap-3">
                {startsNewDay ? (
                  <div className="flex justify-center py-1">
                    <span className="rounded-pill bg-surface-sunken px-3 py-1 text-meta font-medium text-ink-muted">
                      {dayLabel(m.created_at)}
                    </span>
                  </div>
                ) : null}

                <div
                  className={cn(
                    "flex max-w-[82%] flex-col gap-1.5",
                    mine ? "self-end items-end" : "self-start items-start",
                    named && startsRun && i > 0 && "mt-2",
                  )}
                >
                  {named && startsRun ? (
                    <TrustBadge
                      size="sm"
                      name={sender?.name ?? "Unknown member"}
                      isVerified={sender?.isVerified ?? false}
                      avatarUrl={sender?.avatar_url}
                      className="px-1"
                    />
                  ) : null}

                  {m.images_expired ? (
                    <p className="rounded-control bg-surface-sunken px-3.5 py-2.5 text-caption text-ink-muted italic">{t("chat.photosExpired")}</p>
                  ) : receipt ? (
                    <ReceiptBubble url={receipt.url} label={receipt.label} />
                  ) : m.image_urls?.length ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {m.image_urls.slice(0, 5).map((url) => (
                        <PhotoViewerTrigger key={url}>
                          <button
                            type="button"
                            aria-label={t("chat.viewFullSize")}
                            className="block overflow-hidden rounded-control"
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
                      ))}
                    </div>
                  ) : null}

                  {m.content ? (
                    <p
                      className={cn(
                        "rounded-card px-3.5 py-2.5 text-body",
                        mine
                          ? "rounded-br-chip bg-brand text-on-brand"
                          : "rounded-bl-chip bg-surface text-ink",
                        named && cn("border-l-2 pl-3", TONE_RAIL_LEFT[tone]),
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

          <div ref={endRef} />
        </div>
      </div>

      {/* Attached above the composer, outside the scroll region, so the step
          the deal is waiting on cannot scroll out from under its own toggle.
          Read-only rooms have no composer and so no toggle — the action stays
          open there rather than becoming unreachable. */}
      {action && (actionOpen || isReadOnly) ? (
        <div className="min-h-0 max-h-[50%] shrink overflow-y-auto overscroll-contain">
          {action}
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
            const value = inputRef.current?.value.trim();
            if (!value) return;
            void onSend?.(value);
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          {action ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              pill
              aria-expanded={actionOpen}
              aria-label={
                actionOpen ? "Hide the current step" : "Show the current step"
              }
              onPress={() => setActionOpen((v) => !v)}
              // Tinted while folded away, so a pending step cannot be lost
              // behind its own toggle.
              className={cn(!actionOpen && "bg-brand-subtle text-ink-brand")}
            >
              <ChevronUp
                className={cn(
                  "size-5 transition-transform duration-[--dur-fast]",
                  actionOpen && "rotate-180",
                )}
              />
            </Button>
          ) : null}

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
            onChange={(e) => {
              if (e.target.files?.length) void onAttach?.(e.target.files);
            }}
          />

          <input
            ref={inputRef}
            aria-label={t("chat.message")}
            placeholder={t("chat.writeMessage")}
            className="h-11 min-w-0 flex-1 rounded-pill bg-surface-sunken px-4 text-body shadow-sunken"
          />

          <Button type="submit" size="icon" pill aria-label={t("chat.send")}>
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
  return (
    <section
      className={cn("border-t border-line bg-brand-subtle/30", className)}
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
