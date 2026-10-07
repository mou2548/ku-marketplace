import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import {
  AllowRestrictedAccount,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * ใช้แนบรูปได้ทั่วไป (สลิปโอนเงิน, รูปสินค้า, รูปโพสต์แจกของ ฯลฯ)
   * frontend ยิง multipart/form-data field ชื่อ "file" แล้วเอา url ที่ได้กลับมา
   * ไปใส่ในฟิลด์ image_url/slip_image_url ของ endpoint อื่นต่อ
   */
  // A suspended or banned account still appeals, and the flow's appeal
  // carries evidence photos, so it may upload. It cannot attach an image to
  // anything else: every other write is closed to it.
  @AllowRestrictedAccount()
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'ต้องแนบไฟล์รูปภาพมาด้วย (field name: file)',
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('รองรับเฉพาะไฟล์ JPEG, PNG, WEBP เท่านั้น');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('ขนาดไฟล์ต้องไม่เกิน 5MB');
    }

    const result = await this.cloudinaryService.uploadBuffer(file.buffer);
    return { url: result.secure_url };
  }
}
