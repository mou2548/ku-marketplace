/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GiveawaysService } from './giveaways.service';
import type { PrismaService } from '../prisma/prisma.service';

const receiver = (userId: number) => ({
  userId,
  firstNameEn: `User${userId}`,
  lastNameEn: 'Test',
  emailVerifiedAt: new Date(),
});

const ticket = (ticketId: number) => ({
  ticketId,
  giveawayId: 2,
  receiverId: ticketId + 10,
  status: 'Registered',
  updatedAt: new Date(),
  receiver: receiver(ticketId + 10),
});

describe('GiveawaysService allocation boundaries', () => {
  function setupTransaction(overrides: Record<string, unknown> = {}) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ giveaway_id: 2 }]),
      user: { findUnique: jest.fn().mockResolvedValue(receiver(12)) },
      giveawayPost: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      giveawayTicket: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      chatRoom: {
        findFirst: jest.fn().mockResolvedValue({ roomId: 1 }),
        create: jest.fn(),
      },
      ...overrides,
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    return { service: new GiveawaysService(prisma), tx };
  }

  it('allocates the final First Come place and closes registration atomically', async () => {
    const { service, tx } = setupTransaction();
    tx.giveawayPost.findUnique.mockResolvedValue({
      giveawayId: 2,
      giverId: 99,
      status: 'Active',
      allocationMethod: 'FirstCome',
      quantity: 1,
      registerDeadline: new Date(Date.now() + 60_000),
    });
    tx.giveawayTicket.count.mockResolvedValue(0);
    tx.giveawayTicket.create.mockResolvedValue({
      ...ticket(2),
      status: 'Waiting',
    });

    await expect(service.join('giveaway_2', 12)).resolves.toEqual(
      expect.objectContaining({
        status: 'Waiting',
        registration_open: false,
        remaining_slots: 0,
        guaranteed: true,
      }),
    );
    expect(tx.giveawayTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'Waiting' }),
      }),
    );
    expect(tx.giveawayPost.update).toHaveBeenCalledWith({
      where: { giveawayId: 2 },
      data: { status: 'Closed' },
    });
  });

  it('selects every entrant when a Random draw is under capacity', async () => {
    const { service, tx } = setupTransaction();
    tx.giveawayPost.findUnique.mockResolvedValue({
      giveawayId: 2,
      giverId: 9,
      allocationMethod: 'Random',
      status: 'Active',
      registerDeadline: new Date(Date.now() - 1000),
      quantity: 3,
    });
    tx.giveawayTicket.findMany.mockResolvedValue([ticket(1), ticket(2)]);

    const result = await service.draw('giveaway_2', 9);

    expect(result.recipients).toHaveLength(2);
    expect(tx.giveawayTicket.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ ticketId: { in: [1, 2] } }),
        data: expect.objectContaining({ status: 'Waiting' }),
      }),
    );
  });

  it('selects every entrant when a Random draw exactly reaches capacity', async () => {
    const { service, tx } = setupTransaction();
    tx.giveawayPost.findUnique.mockResolvedValue({
      giveawayId: 2,
      giverId: 9,
      allocationMethod: 'Random',
      status: 'Active',
      registerDeadline: new Date(Date.now() - 1000),
      quantity: 2,
    });
    tx.giveawayTicket.findMany.mockResolvedValue([ticket(1), ticket(2)]);

    const result = await service.draw('giveaway_2', 9);

    expect(result.recipients).toHaveLength(2);
    expect(tx.giveawayTicket.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ ticketId: { notIn: [1, 2] } }),
      }),
    );
  });

  it('closes an empty Random draw without repeatedly retrying', async () => {
    const { service, tx } = setupTransaction();
    tx.giveawayPost.findUnique.mockResolvedValue({
      giveawayId: 2,
      giverId: 9,
      allocationMethod: 'Random',
      status: 'Active',
      registerDeadline: new Date(Date.now() - 1000),
      quantity: 2,
    });
    tx.giveawayTicket.findMany.mockResolvedValue([]);

    await expect(service.draw('giveaway_2', 9)).resolves.toEqual(
      expect.objectContaining({ recipients: [] }),
    );
  });

  it('selects exactly the configured number of unique Random winners', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.25);
    const { service, tx } = setupTransaction();
    tx.giveawayPost.findUnique.mockResolvedValue({
      giveawayId: 2,
      giverId: 9,
      allocationMethod: 'Random',
      status: 'Active',
      registerDeadline: new Date(Date.now() - 1000),
      quantity: 2,
    });
    tx.giveawayTicket.findMany.mockResolvedValue([
      ticket(1),
      ticket(2),
      ticket(3),
      ticket(4),
    ]);

    const result = await service.draw('2', 9);

    expect(result.recipients).toHaveLength(2);
    expect(
      new Set(result.recipients.map((entry) => entry.ticket_id)).size,
    ).toBe(2);
    expect(tx.giveawayTicket.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ status: 'NotSelected' }),
      }),
    );
    jest.restoreAllMocks();
  });
});

describe('GiveawaysService forfeiture', () => {
  it('persists Forfeited for a selected recipient', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      giveawayTicket: {
        findUnique: jest.fn().mockResolvedValue({
          ticketId: 8,
          receiverId: 21,
          status: 'Waiting',
        }),
        update,
      },
    } as unknown as PrismaService;
    const service = new GiveawaysService(prisma);

    await expect(service.forfeit('recipient_8', true, 21)).resolves.toEqual({
      recipient_id: 'recipient_008',
      confirm: true,
      status: 'forfeited',
    });
    expect(update).toHaveBeenCalledWith({
      where: { ticketId: 8 },
      data: { status: 'Forfeited', updatedAt: expect.any(Date) },
    });
  });
});
