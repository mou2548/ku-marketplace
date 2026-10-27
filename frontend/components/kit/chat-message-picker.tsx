"use client";

import { Checkbox } from "./choice";
import type { ChatMessage } from "@/lib/api/types";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";

/** The backend's own limit (`MAX_EVIDENCE_MESSAGES`). */
export const MAX_EVIDENCE_MESSAGES = 10;

/**
 * Chat messages picked out as report evidence, so the admin knows exactly
 * which lines the report is about instead of reading the whole room. Newest
 * first: the message being reported is usually recent. The other side's
 * messages are the ones that matter, so the viewer's own read quieter.
 */
export function ChatMessagePicker({
  messages,
  viewerId,
  selected,
  onChange,
}: {
  messages: ChatMessage[];
  viewerId: number;
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const full = selected.length >= MAX_EVIDENCE_MESSAGES;
  const newestFirst = [...messages].reverse();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm font-medium text-ink-secondary">
        Chat messages{" "}
        <span className="font-normal text-ink-muted">
          ({selected.length}/{MAX_EVIDENCE_MESSAGES})
        </span>
      </p>
      {messages.length === 0 ? (
        <p className="text-caption text-ink-muted">
          No messages in this chat yet.
        </p>
      ) : (
        <ul
          aria-label="Chat messages to attach"
          className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-control bg-surface-sunken p-2 shadow-sunken"
        >
          {newestFirst.map((message) => {
            const mine = message.sender_id === viewerId;
            const isSelected = selected.includes(message.message_id);
            const photos = message.image_urls?.length ?? 0;
            return (
              <li key={message.message_id}>
                <Checkbox
                  isSelected={isSelected}
                  isDisabled={!isSelected && full}
                  onChange={(on) =>
                    onChange(
                      on
                        ? [...selected, message.message_id]
                        : selected.filter((id) => id !== message.message_id),
                    )
                  }
                  className={cn(
                    "items-start rounded-[10px] px-2 py-1.5 data-[disabled]:opacity-50",
                    isSelected && "bg-tone-danger-bg",
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-meta text-ink-muted">
                      <span className={cn("font-medium", !mine && "text-ink")}>
                        {mine ? "You" : (message.sender?.name ?? "Them")}
                      </span>{" "}
                      · {formatDateTime(message.created_at)}
                    </span>
                    <span
                      className={cn(
                        "break-words text-body-sm",
                        mine ? "text-ink-muted" : "text-ink",
                      )}
                    >
                      {photos || message.images_expired ? (
                        <span className="italic text-ink-muted">
                          {message.images_expired
                            ? "(photo expired) "
                            : `(${photos} photo${photos === 1 ? "" : "s"}) `}
                        </span>
                      ) : null}
                      {message.content}
                    </span>
                  </span>
                </Checkbox>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-caption text-ink-muted">
        Tick the messages the report is about. The admin sees them highlighted.
      </p>
    </div>
  );
}
