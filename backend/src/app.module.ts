import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [PrismaModule, ReportModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
