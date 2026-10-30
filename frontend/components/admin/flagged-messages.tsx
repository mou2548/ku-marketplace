import { Flag } from "lucide-react";

import type { EvidenceMessage } from "@/lib/api/types";
import { formatDateTime } from "@/lib/date-format";

/**
 * The chat messages a reporter picked out, shown on their own so the admin
 * reads exactly what the report is about. Used where there is no full deal
 * transcript to highlight them in (user reports, the appeal's verdict).
 */
export function FlaggedMessages({
  messages,
}: {
  messages?: EvidenceMessage[];
}) {
  if (!messages?.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-meta text-tone-danger-fg">
        <Flag aria-hidden className="size-3.5" />
        Messages flagged by the reporter ({messages.length})
      </p>
      <ol className="flex flex-col gap-1.5 text-body-sm">
        {messages.map((m) => (
          <li
            key={m.message_id}
            className="rounded-[8px] border border-line bg-surface px-3 py-2"
          >
            <FlaggedMessageBody message={m} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Sender, time, which deal it came from, the text and any photos. */
export function FlaggedMessageBody({ message }: { message: EvidenceMessage }) {
  return (
    <>
      <p>
        <span className="font-medium text-ink">{message.sender.name}</span>
        <span className="text-ink-muted">
          {" "}
          {formatDateTime(message.created_at)}
          {message.transaction_id ? ` · deal #${message.transaction_id}` : ""}
        </span>
      </p>
      {message.content ? (
        <p className="whitespace-pre-line break-words text-ink-secondary">
          {message.content}
        </p>
      ) : null}
      {message.image_urls?.length ? (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {message.image_urls.map((url, index) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block size-16 overflow-hidden rounded-[6px] bg-surface-sunken"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-only evidence view, arbitrary host */}
                <img
                  src={url}
                  alt={`Photo ${index + 1} in the flagged message`}
                  className="size-full object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
