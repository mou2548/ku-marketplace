import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * อัปโหลด buffer (จาก multipart file) ขึ้น Cloudinary แล้วคืน secure URL
   * ใช้ upload_stream เพราะไฟล์อยู่ใน memory (multer memoryStorage) ไม่ได้
   * เขียนลง disk ก่อน — ไม่มีการเก็บไฟล์ไว้ที่ server เราเองเลย
   */
  uploadBuffer(buffer: Buffer, folder = 'ku-marketplace'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          // §6.2 — บีบอัดอัตโนมัติก่อนจัดเก็บ: ให้ Cloudinary เลือกคุณภาพ/ฟอร์แมต
          // ที่เล็กที่สุดเท่าที่ยังดูดีแทนการเก็บไฟล์ต้นฉบับตรงๆ
          transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException(
                error?.message ?? 'อัปโหลดรูปภาพไม่สำเร็จ',
              ),
            );
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }
}
