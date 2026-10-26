import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PostsModule } from '../posts/posts.module';
import { SellersService } from './sellers.service';
import { SellersController, FollowingController } from './sellers.controller';
@Module({
  imports: [AuthModule, PostsModule],
  providers: [SellersService],
  controllers: [SellersController, FollowingController],
})
export class SellersModule {}
