import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { GiveawaysModule } from './giveaways/giveaways.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, PostsModule, GiveawaysModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}