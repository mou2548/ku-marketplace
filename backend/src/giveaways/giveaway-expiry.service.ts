import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const EXPIRY_SWEEP_INTERVAL_MS = 15_000;

@Injectable()
export class GiveawayExpiryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GiveawayExpiryService.name);
  private sweepRunning = false;

  constructor(private readonly prisma: PrismaService) {}

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

  private async runSweepSafely() {
    if (this.sweepRunning) return;
    this.sweepRunning = true;
    try {
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
