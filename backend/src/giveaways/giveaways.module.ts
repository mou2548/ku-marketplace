import { Module } from '@nestjs/common';
import { GiveawaysController } from './giveaways.controller';
import { GiveawaysService } from './giveaways.service';
import { AuthModule } from '../auth/auth.module';
import { GiveawayExpiryService } from './giveaway-expiry.service';

@Module({
  imports: [AuthModule],
  controllers: [GiveawaysController],
  providers: [GiveawaysService, GiveawayExpiryService],
})
export class GiveawaysModule {}
