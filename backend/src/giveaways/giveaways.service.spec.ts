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
        aggregate: jest.fn().mockResolvedValue({ _max: { queueNumber: 0 } }),
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

  it('allows re-registration after a forfeited ticket and never reuses a queue number', async () => {
    const { service, tx } = setupTransaction();
    tx.giveawayPost.findUnique.mockResolvedValue({
      giveawayId: 2,
      giverId: 99,
      status: 'Active',
      allocationMethod: 'FirstCome',
      quantity: 4,
    });
    tx.giveawayTicket.count.mockResolvedValue(1);
    tx.giveawayTicket.aggregate.mockResolvedValue({ _max: { queueNumber: 7 } });
    tx.giveawayTicket.create.mockResolvedValue({
      ...ticket(8),
      queueNumber: 8,
      status: 'Waiting',
    });

    const result = await service.join('2', 12);
    expect(result.queue_number).toBe(8);
    expect(result.remaining_slots).toBe(2);
    expect(tx.giveawayTicket.findFirst).toHaveBeenCalledWith({
      where: {
        giveawayId: 2,
        receiverId: 12,
        status: { in: ['Registered', 'Waiting', 'Received'] },
      },
    });
    expect(tx.giveawayTicket.count).toHaveBeenCalledWith({
      where: {
        giveawayId: 2,
        status: { in: ['Registered', 'Waiting', 'Received'] },
      },
    });
  });

  it.each(['Registered', 'Waiting', 'Received'])(
    'rejects a duplicate live %s ticket',
    async (status) => {
      const { service, tx } = setupTransaction();
      tx.giveawayPost.findUnique.mockResolvedValue({
        giveawayId: 2,
        giverId: 99,
        status: 'Active',
      });
      tx.giveawayTicket.findFirst.mockResolvedValue({ ...ticket(1), status });
      await expect(service.join('2', 12)).rejects.toThrow(
        'ผู้ใช้นี้เข้าร่วมแล้ว',
      );
      expect(tx.giveawayTicket.create).not.toHaveBeenCalled();
    },
  );

  it('reads the giveaway name from its item on both public endpoints', async () => {
    const giveaway = {
      giveawayId: 2,
      itemId: 10,
      item: { name: 'Current item name' },
      giverId: 99,
      giver: receiver(99),
      images: [],
      quantity: 5,
      status: 'Active',
      allocationMethod: 'FirstCome',
      _count: { tickets: 2 },
    };
    const prisma = {
      giveawayPost: {
        findUnique: jest.fn().mockResolvedValue(giveaway),
        findMany: jest.fn().mockResolvedValue([giveaway]),
      },
    };
    const service = new GiveawaysService(prisma as unknown as PrismaService);
    expect(await service.detail('2')).toEqual(
      expect.objectContaining({
        item_name: 'Current item name',
        participant_count: 2,
      }),
    );
    expect(await service.findAll()).toEqual([
      expect.objectContaining({ item_name: 'Current item name' }),
    ]);
  });

  it('rejects text exceeding the new database limits before creating a giveaway', async () => {
    const { service } = setupTransaction();
    await expect(
      service.create({ description: 'x'.repeat(2001) }, 99),
    ).rejects.toThrow('description');
    await expect(
      service.sendGiveawayMessage('2', { content: 'x'.repeat(2001) }, 99),
    ).rejects.toThrow('content');
  });

  it('does not advertise every entrant as guaranteed after an oversubscribed draw', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      giveawayId: 2,
      itemId: 10,
      item: { name: 'Book' },
      giverId: 99,
      giver: receiver(99),
      images: [],
      quantity: 2,
      status: 'Closed',
      allocationMethod: 'Random',
      _count: { tickets: 3 },
    });
    const service = new GiveawaysService({
      giveawayPost: { findUnique },
    } as unknown as PrismaService);
    expect((await service.detail('2')).all_registered_guaranteed).toBe(false);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: {
            select: {
              tickets: {
                where: {
                  status: {
                    in: ['Registered', 'Waiting', 'Received', 'NotSelected'],
                  },
                },
              },
            },
          },
        }),
      }),
    );
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
