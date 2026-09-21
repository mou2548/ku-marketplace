import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    const rows = await this.prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      notification_id: row.notificationId,
      kind: 'deal',
      title: row.title,
      body: row.body,
      href: row.href,
      created_at: row.createdAt,
      read: false,
    }));
  }
}
