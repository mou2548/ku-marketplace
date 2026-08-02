import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsModule } from './items/items.module';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsController } from './transactions/transactions.controller';
import { TransactionsService } from './transactions/transactions.service';
import { AppointmentCardsController } from './appointment-cards/appointment-cards.controller';
import { AppointmentCardsService } from './appointment-cards/appointment-cards.service';

@Module({
  imports: [PrismaModule, ItemsModule],
  controllers: [
    AppController,
    TransactionsController,
    AppointmentCardsController,
  ],
  providers: [
    AppService,
    TransactionsService,
    AppointmentCardsService,
  ],
})
export class AppModule {}