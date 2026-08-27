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

// หมายเหตุ: เพิ่มแค่ guard กันคนไม่ login เรียก endpoint ที่แก้ข้อมูลได้
// ยังไม่ได้เปลี่ยนวิธีรับ owner_id/proposer_id/buyer_id (ยังมาจาก body เหมือนเดิม)
// ในระยะยาวควรเปลี่ยนไปอ่านจาก @CurrentUser() แทนการเชื่อค่าที่ client ส่งมาตรงๆ
// (เหมือนที่ items/membership/transaction ทำอยู่แล้ว) — เป็นคนละเรื่องกับ auth
// ที่ควรคุยกับคนดูแล posts module ก่อนแก้
//
// §envelope — ข้อความ success เดิมที่เคยฝังอยู่ใน postsService.ok(...) ย้ายมาไว้
// เป็น @ResponseMessage(...) ตรงนี้แทน เพราะตอนนี้ ResponseInterceptor ตัวเดียว
// เป็นคนสร้าง { success, message, data } ให้ทั้งระบบ — service ไม่ห่อ envelope เองแล้ว
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('สร้างโพสต์สำเร็จ')
  createPost(@Body() body: CreatePostPayload) {
    return this.postsService.createPost(body);
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
  ) {
    return this.postsService.updatePostPrice(postId, body);
  }

  @Delete(':post_id')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ลบโพสต์สำเร็จ')
  deletePost(@Param('post_id') postId: string) {
    return this.postsService.deletePost(postId);
  }

  @Post(':post_id/buy')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ทำการซื้อสำเร็จ')
  buyPost(@Param('post_id') postId: string, @Body() body: BuyPostPayload) {
    return this.postsService.buyPost(postId, body);
  }

  @Post(':post_id/offers')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('เสนอข้อแลกเปลี่ยนสำเร็จ')
  createOffer(
    @Param('post_id') postId: string,
    @Body() body: CreateOfferPayload,
  ) {
    return this.postsService.createOffer(postId, body);
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
  ) {
    return this.postsService.acceptOffer(postId, offerId, body);
  }

  @Post(':post_id/offers/:offer_id/withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ถอนข้อเสนอสำเร็จ')
  withdrawOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
  ) {
    return this.postsService.withdrawOffer(postId, offerId);
  }

  @Post(':post_id/offers/:offer_id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('ปฏิเสธข้อเสนอสำเร็จ')
  rejectOffer(
    @Param('post_id') postId: string,
    @Param('offer_id') offerId: string,
  ) {
    return this.postsService.rejectOffer(postId, offerId);
  }
}
