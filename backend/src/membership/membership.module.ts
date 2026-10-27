import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService], // ให้ PostsModule เรียกใช้ canCreatePost()/incrementPostUsage() ได้ต่อไป
})
export class MembershipModule {}
