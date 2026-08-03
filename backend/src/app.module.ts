import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';
import { GiveawaysModule } from './giveaways/giveaways.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, PostsModule, GiveawaysModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
