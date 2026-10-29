import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ReportModule } from '../report/report.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  // ReportModule: suspending and reinstating share the moderation rules.
  // AuthModule: JwtAuthGuard.
  imports: [ReportModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
