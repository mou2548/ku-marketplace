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
  draw(@Param('id') id: string) {
    return this.giveawaysService.draw(id);
  }

  @Post('giveaways/:id/select')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('เลือกผู้ชนะสำเร็จ')
  select(@Param('id') id: string, @Body() body: SelectRecipientsPayload) {
    return this.giveawaysService.select(id, body.receiver_ids ?? []);
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
  ) {
    return this.giveawaysService.forfeit(recipientId, body.confirm === true);
  }

  @Post('giveaways/:id/tickets/:ticket_id/qr/generate')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('สร้าง QR สำเร็จ')
  qrGenerate(@Param('id') id: string, @Param('ticket_id') ticketId: string) {
    return this.giveawaysService.qrGenerate(id, ticketId);
  }

  @Post('giveaways/:id/tickets/:ticket_id/qr/scan')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  qrScan(
    @Param('id') id: string,
    @Param('ticket_id') ticketId: string,
    @Body() body: ScanQrPayload,
  ) {
    return this.giveawaysService.qrScan(id, ticketId, body.token);
  }

  @Post('giveaways/:id/tickets/:ticket_id/qr/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ยืนยันรับของสำเร็จ')
  qrConfirm(
    @Param('id') id: string,
    @Param('ticket_id') ticketId: string,
    @Body() body: ConfirmQrPayload,
  ) {
    return this.giveawaysService.qrConfirm(id, ticketId, body.token);
  }
}
