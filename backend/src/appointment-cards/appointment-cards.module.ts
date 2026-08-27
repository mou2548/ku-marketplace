import { Module } from '@nestjs/common';
import { AppointmentCardsController } from './appointment-cards.controller';
import { AppointmentCardsService } from './appointment-cards.service';
import { AuthModule } from '../auth/auth.module';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  // AuthModule → JwtAuthGuard, TransactionModule → TransactionService (สำหรับ proxy QR)
  imports: [AuthModule, TransactionModule],
  controllers: [AppointmentCardsController],
  providers: [AppointmentCardsService],
})
export class AppointmentCardsModule {}
