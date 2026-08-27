import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { RequestMembershipDto, ReviewMembershipDto } from './dto/membership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

// §rename — controller prefix ว่างเปล่าแล้วให้แต่ละ route ประกาศ path เต็มเอง
// (แบบเดียวกับ ReportController) เพราะ /admin/membership/:id/approve อยู่คนละ
// prefix กับ /membership/* ที่เหลือ รวมไว้ในไฟล์เดียวเพราะยังใช้ MembershipService
// ตัวเดียวกัน ไม่ได้ต่างจากเดิมแค่ path เปลี่ยน
@Controller()
export class MembershipController {
  constructor(private membershipService: MembershipService) {}

  // §rename — เดิมคือ POST /membership/request
  @UseGuards(JwtAuthGuard)
  @Post('membership/subscribe')
  @ResponseMessage('ส่งคำขอสมัครสมาชิกสำเร็จ รอการตรวจสอบจากแอดมิน')
  requestUpgrade(@CurrentUser() user: CurrentUserPayload, @Body() dto: RequestMembershipDto) {
    return this.membershipService.requestUpgrade(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('membership/status')
  @ResponseMessage('ดึงสถานะสมาชิกสำเร็จ')
  status(@CurrentUser() user: CurrentUserPayload) {
    return this.membershipService.getStatus(user.userId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('membership/payments/pending')
  @ResponseMessage('ดึงรายการคำขอที่รอตรวจสอบสำเร็จ')
  listPending() {
    return this.membershipService.listPendingPayments();
  }

  // §rename — เดิมคือ POST /membership/payments/:id/review
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/membership/:id/approve')
  @ResponseMessage('ตรวจสอบคำขอสมัครสมาชิกสำเร็จ')
  review(
    @CurrentUser() admin: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewMembershipDto,
  ) {
    return this.membershipService.reviewPayment(id, admin.userId, dto.approve, dto.rejectionReason);
  }
}
