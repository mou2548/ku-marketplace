"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ImagePlus, Send } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Surface } from "./surface";

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
  className?: string;
}

export function ChatThread({
  messages,
  viewerId,
  action,
  systemCards = [],
  onSend,
  onAttach,
  isReadOnly = false,
  readOnlyNotice = "Only the giver can post in this room",
  className,
}: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-4">
        {messages.map((m) => {
          const mine = m.sender_id === viewerId;
          return (
            <div key={m.message_id} className="flex flex-col gap-3">
              <div
                className={cn(
                  "flex max-w-[82%] flex-col gap-1.5",
                  mine ? "self-end items-end" : "self-start items-start",
                )}
              >
                {m.image_urls?.length ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {m.image_urls.slice(0, 5).map((url) => (
                      <Image
                        key={url}
                        src={url}
                        alt=""
                        width={220}
                        height={220}
                        className="aspect-square rounded-control object-cover shadow-raised"
                      />
                    ))}
                  </div>
                ) : null}

                {m.content ? (
                  <p
                    className={cn(
                      "rounded-card px-3.5 py-2.5 text-[0.9375rem] leading-[1.7]",
                      mine
                        ? "rounded-br-chip bg-brand text-on-brand"
                        : "rounded-bl-chip bg-surface text-ink shadow-raised",
                    )}
                  >
                    {m.content}
                  </p>
                ) : null}

                <time
                  dateTime={m.created_at}
                  className="px-1 text-[0.75rem] text-ink-muted"
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

        {action ? <div className="pt-1">{action}</div> : null}
        <div ref={endRef} />
      </div>

      {isReadOnly ? (
        <p className="border-t border-line px-4 py-3 text-center text-[0.8125rem] text-ink-muted">
          {readOnlyNotice}
        </p>
      ) : (
        <form
          className="flex items-end gap-2 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            const value = inputRef.current?.value.trim();
            if (!value) return;
            void onSend?.(value);
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            pill
            aria-label="Attach images, up to 5"
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
            aria-label="Message"
            placeholder="Write a message"
            className="h-11 min-w-0 flex-1 rounded-pill bg-surface-sunken px-4 text-[0.9375rem] shadow-sunken"
          />

          <Button type="submit" size="icon" pill aria-label="Send">
            <Send className="size-5" />
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * The slot a flow action occupies inside the thread. Tinted and titled so it
 * is unmistakably a commitment rather than a message.
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
    <Surface
      as="section"
      shape="card"
      elevation="floating"
      className={cn("ring-2 ring-brand-subtle", className)}
      aria-label={title}
    >
      <h4 className="border-b border-line px-4 py-2.5 text-[0.8125rem] leading-[1.5] font-semibold tracking-[0.09em] text-ink-brand uppercase">
        {title}
      </h4>
      <div className="p-4">{children}</div>
    </Surface>
  );
}
