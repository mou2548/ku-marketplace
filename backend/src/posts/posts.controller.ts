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
import { ResponseMessage } from '../common/decorators/response-message.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('สร้างโพสต์สำเร็จ')
  createPost(
    @Body() body: CreatePostPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.postsService.createPost(body, user.userId);
  }

  @Get()
  @ResponseMessage('นำโพสต์ทั้งหมดมาแสดงสำเร็จ')
  findAllPosts() {
    return this.postsService.findAllPosts();
  }

  @Get(':post_id')
  @ResponseMessage('รายละเอียดโพสต์สำเร็จ')
  getPostById(@Param('post_id') postId: string) {
    return this.postsService.getPostById(postId);
  }

  @Patch(':post_id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('แก้ไขโพสต์สำเร็จ')
  updatePostPrice(
    @Param('post_id') postId: string,
    @Body() body: UpdatePostPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.postsService.updatePostPrice(postId, body, user.userId);
  }

  @Delete(':post_id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ลบโพสต์สำเร็จ')
  deletePost(
    @Param('post_id') postId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.postsService.deletePost(postId, user.userId);
  }

  @Post(':post_id/buy')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ทำการซื้อสำเร็จ')
  buyPost(
    @Param('post_id') postId: string,
    @Body() body: BuyPostPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.postsService.buyPost(postId, {
      ...body,
      buyer_id: user.userId,
    });
  }

  @Post(':post_id/offers')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('เสนอข้อแลกเปลี่ยนสำเร็จ')
  createOffer(
    @Param('post_id') postId: string,
    @Body() body: CreateOfferPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.postsService.createOffer(postId, {
      ...body,
      proposer_id: user.userId,
    });
  }

  @Get(':post_id/offers')
  @ResponseMessage('แสดงข้อแลกเปลี่ยนสำเร็จ')
  getOffers(@Param('post_id') postId: string) {
    return this.postsService.getOffers(postId);
  }

  @Post(':post_id/offers/:offer_id/accept')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ตอบรับข้อเสนอสำเร็จ')
  acceptOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
    @Body() body: AcceptOfferPayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.postsService.acceptOffer(postId, offerId, body, user.userId);
  }

  @Post(':post_id/offers/:offer_id/withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ถอนข้อเสนอสำเร็จ')
  withdrawOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.postsService.withdrawOffer(postId, offerId, user.userId);
  }

  @Post(':post_id/offers/:offer_id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ปฏิเสธข้อเสนอสำเร็จ')
  rejectOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.postsService.rejectOffer(postId, offerId, user.userId);
  }
}
