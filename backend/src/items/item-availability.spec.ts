import { getItemAvailability } from './item-availability';
import type { PrismaService } from '../prisma/prisma.service';

function client(opts: {
  quantity: number;
  posts?: unknown[];
  giveaways?: unknown[];
}) {
  return {
    item: {
      findUnique: jest.fn().mockResolvedValue({ quantity: opts.quantity }),
    },
    post: { findMany: jest.fn().mockResolvedValue(opts.posts ?? []) },
    giveawayPost: {
      findMany: jest.fn().mockResolvedValue(opts.giveaways ?? []),
    },
  } as unknown as PrismaService;
}

describe('getItemAvailability — giveaway ticket release', () => {
  it('keeps a giveaway fully committed while its tickets are still open or received', async () => {
    const result = await getItemAvailability(
      client({
        quantity: 10,
        giveaways: [
          {
            quantity: 5,
            tickets: [
              { status: 'Received' },
              { status: 'Received' },
              { status: 'Waiting' },
              { status: 'Registered' },
              { status: 'NotSelected' },
            ],
          },
        ],
      }),
      1,
    );
    // 5 committed regardless of how the 5 winning slots have resolved so
    // far — Registered/NotSelected never had a unit assigned at all.
    expect(result.available).toBe(5);
  });

  it('releases one unit back to available when a ticket expires unclaimed', async () => {
    const result = await getItemAvailability(
      client({
        quantity: 10,
        giveaways: [
          {
            quantity: 5,
            tickets: [
              { status: 'Received' },
              { status: 'Expired' },
              { status: 'Waiting' },
            ],
          },
        ],
      }),
      1,
    );
    // Same 5-slot giveaway as above, but one winner let the pickup window
    // pass — that unit is never coming back to that recipient, so it
    // returns to the owner's available stock instead of staying spent.
    expect(result.available).toBe(6);
  });

  it("releases a forfeited ticket's unit the same way as an expired one", async () => {
    const result = await getItemAvailability(
      client({
        quantity: 10,
        giveaways: [{ quantity: 3, tickets: [{ status: 'Forfeited' }] }],
      }),
      1,
    );
    expect(result.available).toBe(8);
  });

  it('marks the item transferred once every unit is either received or released', async () => {
    const result = await getItemAvailability(
      client({
        quantity: 2,
        giveaways: [
          {
            quantity: 2,
            tickets: [{ status: 'Received' }, { status: 'Expired' }],
          },
        ],
      }),
      1,
    );
    // Fully resolved (1 handed over, 1 released), but the released unit is
    // real stock again — not transferred, since there is something left.
    expect(result.available).toBe(1);
    expect(result.isTransferred).toBe(false);
  });

  it('does not mark the item transferred while a ticket is still Waiting, even if the giveaway is otherwise resolved', async () => {
    const result = await getItemAvailability(
      client({
        quantity: 1,
        giveaways: [{ quantity: 1, tickets: [{ status: 'Waiting' }] }],
      }),
      1,
    );
    expect(result.available).toBe(0);
    expect(result.isTransferred).toBe(false);
  });
});

describe('getItemAvailability — units nobody won', () => {
  it('reserves open giveaway capacity despite repeated forfeits and re-registration', async () => {
    const result = await getItemAvailability(
      client({
        quantity: 3,
        giveaways: [
          {
            quantity: 3,
            status: 'Active',
            tickets: [
              { status: 'Forfeited' },
              { status: 'Forfeited' },
              { status: 'Waiting' },
            ],
          },
        ],
      }),
      1,
    );
    expect(result.available).toBe(0);
    expect(result.isTransferred).toBe(false);
  });

  it('frees the undrawn units once a Random giveaway closes with fewer registrants', async () => {
    // 6 owned, 2 listed for sale, 3 given away at random, 1 person registered.
    const result = await getItemAvailability(
      client({
        quantity: 6,
        posts: [
          {
            status: 'Active',
            deletedAt: null,
            quantityTotal: 2,
            quantityRemaining: 2,
          },
        ],
        giveaways: [
          { quantity: 3, status: 'Closed', tickets: [{ status: 'Waiting' }] },
        ],
      }),
      1,
    );
    expect(result.available).toBe(3);
  });

  it('keeps the full quantity committed while registration is still open', async () => {
    const result = await getItemAvailability(
      client({
        quantity: 6,
        giveaways: [
          {
            quantity: 3,
            status: 'Active',
            tickets: [{ status: 'Registered' }],
          },
        ],
      }),
      1,
    );
    expect(result.available).toBe(3);
  });

  it('counts only awarded tickets after allocation, releasing expired and forfeited ones', async () => {
    const result = await getItemAvailability(
      client({
        quantity: 10,
        giveaways: [
          {
            quantity: 5,
            status: 'Closed',
            tickets: [
              { status: 'Received' },
              { status: 'Waiting' },
              { status: 'Expired' },
              { status: 'Forfeited' },
              { status: 'NotSelected' },
            ],
          },
        ],
      }),
      1,
    );
    expect(result.available).toBe(8);
    expect(result.isTransferred).toBe(false);
  });

  it('treats a closed giveaway with every winner collected as fully transferred', async () => {
    const result = await getItemAvailability(
      client({
        quantity: 2,
        giveaways: [
          {
            quantity: 2,
            status: 'Completed',
            tickets: [{ status: 'Received' }, { status: 'Received' }],
          },
        ],
      }),
      1,
    );
    expect(result).toEqual({ available: 0, isTransferred: true });
  });
});
