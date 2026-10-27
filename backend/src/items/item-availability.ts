import { Prisma, PrismaClient } from '@prisma/client';

type QueryClient = PrismaClient | Prisma.TransactionClient;

export interface ItemAvailability {
  /** How many units of this item can still be committed to a new channel. */
  available: number;
  /**
   * True once every unit this item ever had has been sold, traded or handed
   * over, with nothing left sitting in an open Post or unclaimed in a
   * Giveaway_Post. Only items.service.ts (update/remove) reads this — every
   * other call site only needs `available`.
   */
  isTransferred: boolean;
}

/**
 * available(item) = Item.quantity
 *                  − Σ quantity_total                          (channel ที่เปิดอยู่)
 *                  − Σ (quantity_total − quantity_remaining)    (channel ที่ปิดแล้ว)
 *                  − Σ quantity                                 (Giveaway_Post, Active)
 *                  − Σ awarded_tickets                          (Giveaway_Post, allocated)
 *
 * Post is "open" when deletedAt is null and status is 'Active'; anything
 * else (soft-deleted, or 'Inactive') is "closed" and only its actually-sold
 * portion (quantityTotal − quantityRemaining) stays committed — the rest
 * flows back into `available`.
 *
 * A Giveaway_Post's `quantity` is committed the moment it's created (the
 * same as a Post's quantityTotal while open — createGiveaway already checks
 * it against `available` up front), regardless of the giveaway's own
 * Active/Closed status. While Active, reserve the full capacity because a
 * forfeited receiver can register again. After closure, a ticket that
 * reaches 'Expired' (the pickup deadline passed
 * before it was scanned) or 'Forfeited' (the recipient gave it up) will
 * never be claimed, so that one unit is released back to `available` —
 * mirroring exactly how an unsold portion of a closed Post already flows
 * back. 'Received' stays permanently committed (already handed over).
 * 'Registered'/'NotSelected' never had a unit assigned to begin with, so
 * they don't move this number either way — the giveaway's `quantity` maps
 * 1:1 to its winning tickets (Waiting/Received/Expired/Forfeited), not to
 * its full registrant pool.
 *
 * Once allocation is over (status Closed or Completed), units nobody won are
 * free again: a Random draw with fewer registrants than units, a FirstCome
 * that closed before filling, or a Manual pick of fewer recipients. From then
 * on only the awarded tickets still waiting for pickup or already received
 * stay committed.
 */
export async function getItemAvailability(
  client: QueryClient,
  itemId: number,
): Promise<ItemAvailability> {
  const item = await client.item.findUnique({
    where: { itemId },
    select: { quantity: true },
  });
  if (!item) {
    return { available: 0, isTransferred: false };
  }

  const posts = await client.post.findMany({
    where: { itemId },
    select: {
      status: true,
      deletedAt: true,
      quantityTotal: true,
      quantityRemaining: true,
    },
  });
  const giveaways = await client.giveawayPost.findMany({
    where: { itemId },
    select: {
      quantity: true,
      status: true,
      tickets: { select: { status: true } },
    },
  });

  let committed = 0;
  let openRemaining = 0;
  for (const post of posts) {
    const open = post.deletedAt === null && post.status === 'Active';
    if (open) {
      committed += post.quantityTotal;
      openRemaining += post.quantityRemaining;
    } else {
      committed += post.quantityTotal - post.quantityRemaining;
    }
  }

  let pendingHandover = 0;
  for (const giveaway of giveaways) {
    const received = giveaway.tickets.filter(
      (ticket) => ticket.status === 'Received',
    ).length;
    if (giveaway.status === 'Active') {
      // Historical forfeits do not release a slot that can still be refilled.
      committed += giveaway.quantity;
      pendingHandover += giveaway.quantity - received;
      continue;
    }
    if (giveaway.status === 'Closed' || giveaway.status === 'Completed') {
      const waiting = giveaway.tickets.filter(
        (ticket) => ticket.status === 'Waiting',
      ).length;
      committed += waiting + received;
      pendingHandover += waiting;
      continue;
    }
    const released = giveaway.tickets.filter(
      (ticket) => ticket.status === 'Expired' || ticket.status === 'Forfeited',
    ).length;
    committed += giveaway.quantity - released;
    pendingHandover += giveaway.quantity - received - released;
  }

  const available = item.quantity - committed;
  const isTransferred =
    available === 0 && openRemaining === 0 && pendingHandover === 0;

  return { available, isTransferred };
}
