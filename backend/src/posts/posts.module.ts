import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { OffersController } from './offers.controller';
import { PostsService } from './posts.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PostsController, OffersController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
