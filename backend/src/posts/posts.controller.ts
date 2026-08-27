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
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import type {
  AcceptOfferPayload,
  BuyPostPayload,
  CreateOfferPayload,
  CreatePostPayload,
  UpdatePostPayload,
} from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// หมายเหตุ: เพิ่มแค่ guard กันคนไม่ login เรียก endpoint ที่แก้ข้อมูลได้
// ยังไม่ได้เปลี่ยนวิธีรับ owner_id/proposer_id/buyer_id (ยังมาจาก body เหมือนเดิม)
// ในระยะยาวควรเปลี่ยนไปอ่านจาก @CurrentUser() แทนการเชื่อค่าที่ client ส่งมาตรงๆ
// (เหมือนที่ items/membership/transaction ทำอยู่แล้ว) — เป็นคนละเรื่องกับ auth
// ที่ควรคุยกับคนดูแล posts module ก่อนแก้
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  updatePostPrice(
    @Param('post_id') postId: string,
    @Body() body: UpdatePostPayload,
  ) {
    return this.postsService.updatePostPrice(postId, body);
  }

  @Delete(':post_id')
  @UseGuards(JwtAuthGuard)
  deletePost(@Param('post_id') postId: string) {
    return this.postsService.deletePost(postId);
  }

  @Post(':post_id/buy')
  @UseGuards(JwtAuthGuard)
  buyPost(@Param('post_id') postId: string, @Body() body: BuyPostPayload) {
    return this.postsService.buyPost(postId, body);
  }

  @Post(':post_id/offers')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  acceptOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
    @Body() body: AcceptOfferPayload,
  ) {
    return this.postsService.acceptOffer(postId, offerId, body);
  }

  @Post(':post_id/offers/:offer_id/withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  withdrawOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
  ) {
    return this.postsService.withdrawOffer(postId, offerId);
  }

  @Post(':post_id/offers/:offer_id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  rejectOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
  ) {
    return this.postsService.rejectOffer(postId, offerId);
  }
}
