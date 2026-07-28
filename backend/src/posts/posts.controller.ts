import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  createPost(@Body() body: Record<string, any>) {
    return this.postsService.createPost(body);
  }

  @Get()
  findAllPosts() {
    return this.postsService.findAllPosts();
  }

  @Get(':post_id')
  getPostById(@Param('post_id') postId: string) {
    return this.postsService.getPostById(postId);
  }

  @Patch(':post_id')
  updatePostPrice(
    @Param('post_id') postId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.postsService.updatePostPrice(postId, body);
  }

  @Delete(':post_id')
  deletePost(@Param('post_id') postId: string) {
    return this.postsService.deletePost(postId);
  }

  @Post(':post_id/buy')
  buyPost(@Param('post_id') postId: string) {
    return this.postsService.buyPost(postId);
  }

  @Post(':post_id/offer')
  createOffer(
    @Param('post_id') postId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.postsService.createOffer(postId, body);
  }

  @Get(':post_id/offer')
  getOffers(@Param('post_id') postId: string) {
    return this.postsService.getOffers(postId);
  }

  @Post(':post_id/offers/:offer_id/accept')
  acceptOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
  ) {
    return this.postsService.acceptOffer(postId, offerId);
  }

  @Post(':offer_id/withdraw')
  withdrawOffer(@Param('offer_id') offerId: string) {
    return this.postsService.withdrawOffer(offerId);
  }

  @Post(':post_id/offers/:offer_id/reject')
  rejectOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
  ) {
    return this.postsService.rejectOffer(postId, offerId);
  }
}
