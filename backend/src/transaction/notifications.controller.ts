import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  AllowRestrictedAccount,
} from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}
  // A suspended or banned user still needs to read why they were restricted
  // and how to appeal.
  @Get()
  @AllowRestrictedAccount()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    const rows = await this.prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      notification_id: row.notificationId,
      kind: row.eventKey.startsWith('moderation:') ? 'moderation' : 'deal',
      title: row.title,
      body: row.body,
      href: row.href,
      created_at: row.createdAt,
      read: false,
    }));
  }
}
