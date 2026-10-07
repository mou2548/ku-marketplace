import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { GiveawaysService } from './giveaways.service';
import { PrismaService } from '../prisma/prisma.service';

const EXPIRY_SWEEP_INTERVAL_MS = 15_000;

@Injectable()
export class GiveawayExpiryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GiveawayExpiryService.name);
  private sweepRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly giveaways: GiveawaysService,
  ) {}

  async onApplicationBootstrap() {
    await this.runSweepSafely();
  }

  @Interval('giveaway-ticket-expiry', EXPIRY_SWEEP_INTERVAL_MS)
  async handleExpirySweep() {
    await this.runSweepSafely();
  }

  async expireOverdueTickets(now = new Date()) {
    const result = await this.prisma.giveawayTicket.updateMany({
      where: {
        status: 'Waiting',
        giveaway: { pickupDeadline: { lte: now } },
      },
      data: { status: 'Expired', updatedAt: now },
    });
    return result.count;
  }

  async allocateClosedRegistrations(now = new Date()) {
    const due = await this.prisma.giveawayPost.findMany({
      where: {
        status: 'Active',
        registerDeadline: { lte: now },
        allocationMethod: 'Random',
      },
      select: { giveawayId: true, giverId: true },
    });
    for (const giveaway of due) {
      try {
        await this.giveaways.draw(
          String(giveaway.giveawayId),
          giveaway.giverId,
        );
      } catch (error) {
        // Another worker may have drawn it after the query. Continue other draws.
        this.logger.warn(
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    await this.prisma.giveawayPost.updateMany({
      where: {
        status: 'Active',
        allocationMethod: 'FirstCome',
        registerDeadline: { lte: now },
      },
      data: { status: 'Closed' },
    });
    // Manual allocation is the giver's job (flow: "ผู้แจกเลือกผู้มีสิทธิ์เอง").
    // Tell them once when registration closes, so it is not left waiting.
    const toChoose = await this.prisma.giveawayPost.findMany({
      where: {
        status: 'Active',
        allocationMethod: 'Manual',
        registerDeadline: { lte: now },
      },
      select: { giveawayId: true, giverId: true, itemName: true },
    });
    if (toChoose.length) {
      await this.prisma.notification.createMany({
        data: toChoose.map((g) => ({
          userId: g.giverId,
          eventKey: `giveaway:${g.giveawayId}:choose-recipients`,
          title: 'Choose who receives your giveaway',
          body: `Registration for ${g.itemName ?? `giveaway #${g.giveawayId}`} has closed. Pick the recipients.`,
          href: `/giveaway/${g.giveawayId}/manage`,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async runSweepSafely() {
    if (this.sweepRunning) return;
    this.sweepRunning = true;
    try {
      await this.allocateClosedRegistrations();
      const count = await this.expireOverdueTickets();
      if (count > 0) {
        this.logger.log(`Expired ${count} overdue giveaway ticket(s)`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Giveaway ticket expiry sweep failed: ${message}`);
    } finally {
      this.sweepRunning = false;
    }
  }
}
