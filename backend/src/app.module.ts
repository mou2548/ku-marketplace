import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';
import { GiveawaysModule } from './giveaways/giveaways.module';

@Module({
  imports: [PostsModule, GiveawaysModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
