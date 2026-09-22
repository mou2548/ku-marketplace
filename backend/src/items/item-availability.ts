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
 *
 * Post is "open" when deletedAt is null and status is 'Active'; anything
 * else (soft-deleted, or 'Inactive') is "closed" and only its actually-sold
 * portion (quantityTotal − quantityRemaining) stays committed — the rest
 * flows back into `available`.
 *
 * Giveaway_Post has no soft-delete or cancel path in this codebase, so
 * there is no "closed, reclaim the unclaimed portion" case to mirror for it
 * — every giveaway permanently commits its full `quantity` for as long as
 * the row exists. Whether a Random/Manual giveaway that closes without
 * filling every slot should release its leftover units back into
 * `available` was never decided; treating it as permanently committed is
 * the conservative default here. See docs/multi-listing/multi-listing-backend.md.
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
      tickets: { where: { status: 'Received' }, select: { ticketId: true } },
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
    committed += giveaway.quantity;
    pendingHandover += giveaway.quantity - giveaway.tickets.length;
  }

  const available = item.quantity - committed;
  const isTransferred =
    available === 0 && openRemaining === 0 && pendingHandover === 0;

  return { available, isTransferred };
}
