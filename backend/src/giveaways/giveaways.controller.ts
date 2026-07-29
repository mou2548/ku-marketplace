import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GiveawaysService } from './giveaways.service';
import type {
  CreateGiveawayPayload,
  ForfeitPayload,
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
  join(@Param('id') id: string) {
    return this.giveawaysService.join(id);
  }

  @Post('giveaways/:id/draw')
  draw(@Param('id') id: string) {
    return this.giveawaysService.draw(id);
  }

  @Post('giveaways/:id/select')
  select(@Param('id') id: string, @Body() body: SelectRecipientsPayload) {
    return this.giveawaysService.select(id, body.receiver_ids ?? []);
  }

  @Get('giveaways/:id/recipients')
  recipients(@Param('id') id: string) {
    return this.giveawaysService.recipients(id);
  }

  @Post('giveaways/recipients/:recipient_id/forfeit')
  forfeit(
    @Param('recipient_id') recipientId: string,
    @Body() body: ForfeitPayload,
  ) {
    return this.giveawaysService.forfeit(recipientId, body.confirm === true);
  }

  @Post('giveaways-tickets/:id/qr/generate')
  qrGenerate(@Param('id') id: string) {
    return this.giveawaysService.qrGenerate(id);
  }

  @Post('giveaways-tickets/:id/qr/scan')
  qrScan(@Param('id') id: string, @Body() body: ScanQrPayload) {
    return this.giveawaysService.qrScan(id, body.token);
  }
}
