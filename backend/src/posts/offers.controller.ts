import { Controller, Get, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

/**
 * §E4 — the offer inbox needs "every offer I am a party to" in one call, in
 * both directions. `GET /posts/:id/offers` only ever covers one post, so it
 * cannot build the "what did I offer" half at all. Lives on its own path
 * rather than under `/posts` because it is not scoped to a post.
 */
@Controller('offers')
export class OffersController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('แสดงข้อเสนอทั้งหมดของฉันสำเร็จ')
  getMyOffers(@CurrentUser() user: CurrentUserPayload) {
    return this.postsService.getMyOffers(user.userId);
  }
}
