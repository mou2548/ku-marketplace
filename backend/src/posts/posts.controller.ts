import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import type {
  AcceptOfferPayload,
  BuyPostPayload,
  CreateOfferPayload,
  CreatePostPayload,
  UpdatePostPayload,
} from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  createPost(@Body() body: CreatePostPayload) {
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
    @Body() body: UpdatePostPayload,
  ) {
    return this.postsService.updatePostPrice(postId, body);
  }

  @Delete(':post_id')
  deletePost(@Param('post_id') postId: string) {
    return this.postsService.deletePost(postId);
  }

  @Post(':post_id/buy')
  buyPost(@Param('post_id') postId: string, @Body() body: BuyPostPayload) {
    return this.postsService.buyPost(postId, body);
  }

  @Post(':post_id/offers')
  createOffer(
    @Param('post_id') postId: string,
    @Body() body: CreateOfferPayload,
  ) {
    return this.postsService.createOffer(postId, body);
  }

  @Get(':post_id/offers')
  getOffers(@Param('post_id') postId: string) {
    return this.postsService.getOffers(postId);
  }

  @Post(':post_id/offers/:offer_id/accept')
  acceptOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
    @Body() body: AcceptOfferPayload,
  ) {
    return this.postsService.acceptOffer(postId, offerId, body);
  }

  @Post(':post_id/offers/:offer_id/withdraw')
  @HttpCode(HttpStatus.OK)
  withdrawOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
  ) {
    return this.postsService.withdrawOffer(postId, offerId);
  }

  @Post(':post_id/offers/:offer_id/reject')
  @HttpCode(HttpStatus.OK)
  rejectOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
  ) {
    return this.postsService.rejectOffer(postId, offerId);
  }
}
