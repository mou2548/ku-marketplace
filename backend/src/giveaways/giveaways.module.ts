import { Module } from '@nestjs/common';
import { GiveawaysController } from './giveaways.controller';
import { GiveawaysService } from './giveaways.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GiveawaysController],
  providers: [GiveawaysService],
})
export class GiveawaysModule {}
