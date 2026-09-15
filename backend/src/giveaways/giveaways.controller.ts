import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GiveawaysService } from './giveaways.service';
import type {
  ConfirmQrPayload,
  CreateGiveawayPayload,
  ForfeitPayload,
  ScanQrPayload,
  SelectRecipientsPayload,
  SendGiveawayMessagePayload,
} from './giveaways.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';

@Controller()
export class GiveawaysController {
  constructor(private readonly giveawaysService: GiveawaysService) {}

  @Post('giveaways')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('สร้างโพสต์แจกของสำเร็จ')
  create(
    @Body() body: CreateGiveawayPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giveawaysService.create(body, user.userId);
  }

  @Get('giveaways')
  @ResponseMessage('รายการโพสต์แจกของสำเร็จ')
  findAll() {
    return this.giveawaysService.findAll();
  }

  @Get('giveaways/:id')
  @ResponseMessage('รายละเอียดโพสต์แจกของสำเร็จ')
  detail(@Param('id') id: string) {
    return this.giveawaysService.detail(id);
  }

  @Post('giveaways/:id/join')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('เข้าร่วมการแจกของสำเร็จ')
  join(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.giveawaysService.join(id, user.userId);
  }

  @Post('giveaways/:id/draw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('จับฉลากสำเร็จ')
  draw(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.giveawaysService.draw(id, user.userId);
  }

  @Post('giveaways/:id/select')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('เลือกผู้ชนะสำเร็จ')
  select(
    @Param('id') id: string,
    @Body() body: SelectRecipientsPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giveawaysService.select(
      id,
      body.receiver_ids ?? [],
      user.userId,
    );
  }

  @Get('giveaways/:id/recipients')
  @ResponseMessage('สรุปผู้รับของสำเร็จ')
  recipients(@Param('id') id: string) {
    return this.giveawaysService.recipients(id);
  }

  @Post('giveaways/recipients/:recipient_id/forfeit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('สละสิทธิ์สำเร็จ')
  forfeit(
    @Param('recipient_id') recipientId: string,
    @Body() body: ForfeitPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giveawaysService.forfeit(
      recipientId,
      body.confirm === true,
      user.userId,
    );
  }

  @Post('giveaways/:id/tickets/:ticket_id/qr/generate')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('สร้าง QR สำเร็จ')
  qrGenerate(
    @Param('id') id: string,
    @Param('ticket_id') ticketId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giveawaysService.qrGenerate(id, ticketId, user.userId);
  }

  @Post('giveaways/:id/tickets/:ticket_id/qr/scan')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  qrScan(
    @Param('id') id: string,
    @Param('ticket_id') ticketId: string,
    @Body() body: ScanQrPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giveawaysService.qrScan(id, ticketId, body.token, user.userId);
  }

  /**
   * §6, extended — the giver plus every entrant read/write here, unlike a
   * transaction's 1:1 room. See `assertGiveawayMember` in the service.
   */
  @Get('giveaways/:id/message')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ดึงข้อความสำเร็จ')
  getGiveawayMessages(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giveawaysService.getGiveawayMessages(id, user.userId);
  }

  @Post('giveaways/:id/message')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ส่งข้อความสำเร็จ')
  sendGiveawayMessage(
    @Param('id') id: string,
    @Body() body: SendGiveawayMessagePayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giveawaysService.sendGiveawayMessage(id, body, user.userId);
  }

  @Post('giveaways/:id/tickets/:ticket_id/qr/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ยืนยันรับของสำเร็จ')
  qrConfirm(
    @Param('id') id: string,
    @Param('ticket_id') ticketId: string,
    @Body() body: ConfirmQrPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giveawaysService.qrConfirm(
      id,
      ticketId,
      body.token,
      user.userId,
    );
  }
}
