import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MembershipTier,
  MEMBERSHIP_CONFIG,
  MEMBERSHIP_DURATION_DAYS,
} from '../common/constants/membership.constant';
import type { RequestMembershipPayload } from './validation/membership.validation';

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}

  /**
   * §users-facing — เดิมไม่มี endpoint ให้ user เช็คสถานะสมาชิกตัวเองเลยไม่ว่าชื่อไหน
   * รวม tier ที่ซื้อไว้ (`tier`) กับ tier ที่ใช้ได้จริงตอนนี้ (`effectiveTier`, ผ่าน
   * getEffectiveTier ที่มีอยู่แล้ว) แยกกัน เพราะถ้า Silver/Gold/Diamond หมดอายุไปแล้ว
   * แต่ยังไม่ผ่าน downgradeExpiredMemberships (รัน scheduled job) ทั้งสองค่าจะไม่ตรงกัน
   * — user ควรเห็นว่า "ที่จริงตอนนี้ใช้ได้แค่ Free" แม้ column ในตารางยังไม่ถูกอัปเดต
   */
  async getStatus(userId: number) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId },
    });
    if (!subscription) {
      throw new NotFoundException('ไม่พบข้อมูลสมาชิกของผู้ใช้นี้ กรุณาติดต่อแอดมิน');
    }

    const tier = subscription.tier as MembershipTier;
    const effectiveTier = this.getEffectiveTier(tier, subscription.endDate);
    const quota = MEMBERSHIP_CONFIG[effectiveTier].postQuota;
    const postsUsed = subscription.postsUsedThisMonth ?? 0;

    const pendingPayment = await this.prisma.subscriptionPayment.findFirst({
      where: { userId, status: 'Pending' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      tier,
      effectiveTier,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      postsUsedThisMonth: postsUsed,
      postQuota: quota,
      postsRemaining: quota === null ? null : Math.max(quota - postsUsed, 0),
      pendingPayment: pendingPayment
        ? { paymentId: pendingPayment.paymentId, amount: pendingPayment.amount }
        : null,
    };
  }

  async requestUpgrade(userId: number, payload: RequestMembershipPayload) {
    const subscription = await this.prisma.subscription.findFirst({ where: { userId } });
    if (!subscription) {
      throw new BadRequestException('ไม่พบข้อมูลสมาชิกของผู้ใช้นี้ กรุณาติดต่อแอดมิน');
    }

    const pendingPayment = await this.prisma.subscriptionPayment.findFirst({
      where: { userId, status: 'Pending' },
    });
    if (pendingPayment) {
      throw new BadRequestException('มีคำขอสมัครสมาชิกที่รอตรวจสอบอยู่แล้ว กรุณารอผลก่อน');
    }

    const tier = payload.requestedTier as MembershipTier;
    const amount = MEMBERSHIP_CONFIG[tier].priceBaht;

    return this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.subscriptionId,
        userId,
        amount,
        slipImageUrl: payload.proofImageUrl,
        status: 'Pending',
      },
    });
  }

  async listPendingPayments() {
    return this.prisma.subscriptionPayment.findMany({
      where: { status: 'Pending' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { userId: true, email: true, firstNameEn: true } },
        subscription: { select: { tier: true } },
      },
    });
  }

  async reviewPayment(
    paymentId: number,
    adminUserId: number,
    approve: boolean,
    rejectionReason?: string,
  ) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { paymentId },
    });
    if (!payment) {
      throw new NotFoundException('ไม่พบคำขอนี้');
    }
    if (payment.status !== 'Pending') {
      throw new BadRequestException('คำขอนี้ถูกตรวจสอบไปแล้ว');
    }

    const newStatus = approve ? 'Verified' : 'Rejected';

    await this.prisma.subscriptionPayment.update({
      where: { paymentId },
      data: {
        status: newStatus,
        handledBy: adminUserId,
        handledAt: new Date(),
        rejectionReason: approve ? null : (rejectionReason ?? 'ไม่ระบุเหตุผล'),
      },
    });

    if (approve) {
      const tier = this.resolveTierFromAmount(payment.amount);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + MEMBERSHIP_DURATION_DAYS);

      await this.prisma.subscription.update({
        where: { subscriptionId: payment.subscriptionId },
        data: { tier, status: 'Active', startDate: new Date(), endDate },
      });
    }

    return { paymentId, status: newStatus };
  }

  private resolveTierFromAmount(amount: number): MembershipTier {
    const match = (
      Object.entries(MEMBERSHIP_CONFIG) as [MembershipTier, (typeof MEMBERSHIP_CONFIG)[MembershipTier]][]
    ).find(([, config]) => config.priceBaht === amount);

    if (!match) {
      throw new BadRequestException(`ยอดเงิน ${amount} บาท ไม่ตรงกับ tier ใดที่กำหนดไว้`);
    }
    return match[0];
  }

  async canCreatePost(userId: number): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirstOrThrow({ where: { userId } });
    const tier = this.getEffectiveTier(subscription.tier as MembershipTier, subscription.endDate);
    const quota = MEMBERSHIP_CONFIG[tier].postQuota;

    if (quota === null) return true;
    return (subscription.postsUsedThisMonth ?? 0) < quota;
  }

  async incrementPostUsage(userId: number) {
    const subscription = await this.prisma.subscription.findFirstOrThrow({ where: { userId } });
    return this.prisma.subscription.update({
      where: { subscriptionId: subscription.subscriptionId },
      data: { postsUsedThisMonth: { increment: 1 } },
    });
  }

  getEffectiveTier(tier: MembershipTier, endDate: Date | null): MembershipTier {
    if (tier === 'Free') return 'Free';
    if (!endDate || endDate.getTime() < Date.now()) return 'Free';
    return tier;
  }

  async downgradeExpiredMemberships() {
    const result = await this.prisma.subscription.updateMany({
      where: { tier: { not: 'Free' }, endDate: { lt: new Date() } },
      data: { tier: 'Free', endDate: null },
    });
    return { downgradedCount: result.count };
  }

  async resetMonthlyPostUsage() {
    const result = await this.prisma.subscription.updateMany({
      data: { postsUsedThisMonth: 0 },
    });
    return { resetCount: result.count };
  }
}
