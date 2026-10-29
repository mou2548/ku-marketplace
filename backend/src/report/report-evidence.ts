import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ReportType } from '../common/enums/report.enums';
import { displayName } from '../common/utils/display-name';

/**
 * A report's evidence: photos, plus chat messages the reporter picked out.
 *
 * Deployed schema is not being changed (owner, 2026-10-27), so the picked
 * messages live in `Report.evidence_urls` next to the photo URLs, each as
 * `chat-message:<id>`. Nothing outside this file sees that encoding: every
 * reader goes through `splitEvidence`, and a client that sends the prefix
 * itself is refused.
 *
 * Plain functions over a Prisma client, like `account-standing.ts`, so the
 * report and appeal services share them.
 */
type Db = Prisma.TransactionClient;

const MESSAGE_PREFIX = 'chat-message:';

export const MAX_EVIDENCE_PHOTOS = 5;
export const MAX_EVIDENCE_MESSAGES = 10;

export function splitEvidence(stored: unknown): {
  urls: string[];
  messageIds: number[];
} {
  const urls: string[] = [];
  const messageIds: number[] = [];
  if (!Array.isArray(stored)) return { urls, messageIds };
  for (const entry of stored) {
    if (typeof entry !== 'string') continue;
    if (entry.startsWith(MESSAGE_PREFIX)) {
      const id = Number(entry.slice(MESSAGE_PREFIX.length));
      if (Number.isInteger(id) && id > 0) messageIds.push(id);
    } else {
      urls.push(entry);
    }
  }
  return { urls, messageIds };
}

/** What to store; undefined when there is nothing, as before. */
export function joinEvidence(
  urls: string[] = [],
  messageIds: number[] = [],
): string[] | undefined {
  const stored = [...urls, ...messageIds.map((id) => `${MESSAGE_PREFIX}${id}`)];
  return stored.length ? stored : undefined;
}

/**
 * The picked messages must come from a deal chat the reporter is in, and be
 * about what is reported: the reported deal's own chat, or a chat with the
 * reported user. A post report has no chat. Giveaway chats are not supported
 * yet. Anything else is refused, so a report cannot pull someone else's
 * private chat in front of the admin.
 */
export async function assertMessagesBelong(
  db: Db,
  report: { reporterId: number; reportType: string; targetId: number },
  messageIds: number[],
) {
  if (!messageIds.length) return;
  if (report.reportType === ReportType.Post) {
    throw new BadRequestException('A post report cannot include chat messages');
  }
  const unique = [...new Set(messageIds)];
  const messages = await db.chatMessage.findMany({
    where: { messageId: { in: unique } },
    select: {
      room: {
        select: {
          transactionId: true,
          transaction: { select: { buyerId: true, sellerId: true } },
        },
      },
    },
  });
  if (messages.length !== unique.length) {
    throw new BadRequestException('Some chat messages were not found');
  }
  for (const { room } of messages) {
    const deal = room.transaction;
    const parties = deal ? [deal.buyerId, deal.sellerId] : [];
    const fits =
      parties.includes(report.reporterId) &&
      (report.reportType === ReportType.Transaction
        ? room.transactionId === report.targetId
        : report.targetId !== report.reporterId &&
          parties.includes(report.targetId));
    if (!fits) {
      throw new ForbiddenException(
        'Chat messages must come from your own chat about this report',
      );
    }
  }
}

/** The picked messages for the admin, keyed by id, in one query. Images are
 * shown in full: the parties' 7-day display limit does not apply to evidence. */
export async function loadEvidenceMessages(db: Db, messageIds: number[]) {
  const byId = new Map<number, ReturnType<typeof serializeMessage>>();
  if (!messageIds.length) return byId;
  const messages = await db.chatMessage.findMany({
    where: { messageId: { in: [...new Set(messageIds)] } },
    include: { sender: true, room: { select: { transactionId: true } } },
  });
  for (const message of messages) {
    byId.set(message.messageId, serializeMessage(message));
  }
  return byId;
}

function serializeMessage(message: {
  messageId: number;
  roomId: number;
  senderId: number;
  content: string | null;
  imageUrls: unknown;
  createdAt: Date | null;
  room: { transactionId: number | null };
  sender: Parameters<typeof displayName>[0] & {
    userId: number;
    emailVerifiedAt: Date | null;
    avatarUrl?: string | null;
  };
}) {
  return {
    message_id: message.messageId,
    room_id: message.roomId,
    transaction_id: message.room.transactionId,
    sender_id: message.senderId,
    sender: {
      user_id: message.sender.userId,
      name: displayName(message.sender),
      isVerified: message.sender.emailVerifiedAt !== null,
      avatar_url: message.sender.avatarUrl ?? null,
    },
    content: message.content,
    image_urls:
      Array.isArray(message.imageUrls) && message.imageUrls.length
        ? (message.imageUrls as string[])
        : null,
    created_at: message.createdAt,
  };
}

/** The picked messages in chat order; ids whose message is gone are dropped. */
export function pickMessages(
  byId: Awaited<ReturnType<typeof loadEvidenceMessages>>,
  messageIds: number[],
) {
  return messageIds
    .map((id) => byId.get(id))
    .filter((m): m is NonNullable<typeof m> => m !== undefined)
    .sort(
      (a, b) => (a.created_at?.getTime() ?? 0) - (b.created_at?.getTime() ?? 0),
    );
}
