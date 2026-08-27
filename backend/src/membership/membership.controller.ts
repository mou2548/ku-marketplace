import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { RequestMembershipDto, ReviewMembershipDto } from './dto/membership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';

@Controller('membership')
export class MembershipController {
  constructor(private membershipService: MembershipService) {}

  @UseGuards(JwtAuthGuard)
  @Post('request')
  requestUpgrade(@CurrentUser() user: CurrentUserPayload, @Body() dto: RequestMembershipDto) {
    return this.membershipService.requestUpgrade(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('payments/pending')
  listPending() {
    return this.membershipService.listPendingPayments();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('payments/:id/review')
  review(
    @CurrentUser() admin: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewMembershipDto,
  ) {
    return this.membershipService.reviewPayment(id, admin.userId, dto.approve, dto.rejectionReason);
  }
}
