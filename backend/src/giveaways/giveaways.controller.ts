import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { GiveawaysService } from './giveaways.service';
import type {
  CreateGiveawayPayload,
  ForfeitPayload,
  JoinGiveawayPayload,
  ScanQrPayload,
  SelectRecipientsPayload,
} from './giveaways.service';

@Controller()
export class GiveawaysController {
  constructor(private readonly giveawaysService: GiveawaysService) {}

  @Post('giveaways')
  create(@Body() body: CreateGiveawayPayload) {
    return this.giveawaysService.create(body);
  }

  @Get('giveaways/:id')
  detail(@Param('id') id: string) {
    return this.giveawaysService.detail(id);
  }

  @Post('giveaways/:id/join')
  join(@Param('id') id: string, @Body() body: JoinGiveawayPayload) {
    return this.giveawaysService.join(id, body);
  }

  @Post('giveaways/:id/draw')
  @HttpCode(HttpStatus.OK)
  draw(@Param('id') id: string) {
    return this.giveawaysService.draw(id);
  }

  @Post('giveaways/:id/select')
  @HttpCode(HttpStatus.OK)
  select(@Param('id') id: string, @Body() body: SelectRecipientsPayload) {
    return this.giveawaysService.select(id, body.receiver_ids ?? []);
  }

  @Get('giveaways/:id/recipients')
  recipients(@Param('id') id: string) {
    return this.giveawaysService.recipients(id);
  }

  @Post('giveaways/recipients/:recipient_id/forfeit')
  @HttpCode(HttpStatus.OK)
  forfeit(
    @Param('recipient_id') recipientId: string,
    @Body() body: ForfeitPayload,
  ) {
    return this.giveawaysService.forfeit(recipientId, body.confirm === true);
  }

  @Post('giveaways/:id/tickets/:ticket_id/qr/generate')
  qrGenerate(@Param('id') id: string, @Param('ticket_id') ticketId: string) {
    return this.giveawaysService.qrGenerate(id, ticketId);
  }

  @Post('giveaways/:id/tickets/:ticket_id/qr/scan')
  @HttpCode(HttpStatus.OK)
  qrScan(
    @Param('id') id: string,
    @Param('ticket_id') ticketId: string,
    @Body() body: ScanQrPayload,
  ) {
    return this.giveawaysService.qrScan(id, ticketId, body.token);
  }
}
