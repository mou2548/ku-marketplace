import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ItemsModule } from './items/items.module';
import { PostsModule } from './posts/posts.module';
import { GiveawaysModule } from './giveaways/giveaways.module';
import { ReportModule } from './report/report.module';
import { MembershipModule } from './membership/membership.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
// §7.4 fulfillment & payment. Note the singular name: `transactions/` below is a
// different module (§7.6 chat + appointment cards) that also hangs off the
// /transactions/:id path. The two share the URL prefix but no routes.
import { TransactionModule } from './transaction/transaction.module';
import { TransactionsController } from './transactions/transactions.controller';
import { TransactionsService } from './transactions/transactions.service';
import { AppointmentCardsModule } from './appointment-cards/appointment-cards.module';

@Module({
  imports: [
    PrismaModule,
    PostsModule,
    GiveawaysModule,
    AuthModule,
    ReportModule,
    ItemsModule,
    TransactionModule,
    MembershipModule,
    AppointmentCardsModule,
    CloudinaryModule,
  ],
  controllers: [AppController, TransactionsController],
  providers: [AppService, TransactionsService],
})
export class AppModule {}
