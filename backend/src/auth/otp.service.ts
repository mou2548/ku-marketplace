import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const OTP_TTL_SECONDS = 10 * 60;

@Injectable()
export class OtpService {
  constructor(private redis: RedisService) {}

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 หลัก
  }

  /**
   * สร้าง OTP และเก็บ payload ที่รอยืนยัน (email/password/phone) ไว้ใน Redis ชั่วคราว
   * ยังไม่สร้าง User จริงใน DB จนกว่าจะ verify สำเร็จ (กัน "ผู้ใช้ขยะ" ค้างตาราง)
   */
  async createAndStore(email: string, pendingPayload: object): Promise<string> {
    const otp = this.generateCode();
    const otpKey = `register:otp:${email}`;
    const payloadKey = `register:pending:${email}`;

    await this.redis.setex(otpKey, OTP_TTL_SECONDS, otp);
    await this.redis.setex(payloadKey, OTP_TTL_SECONDS, JSON.stringify(pendingPayload));

    return otp;
  }

  /**
   * ตรวจสอบ OTP กับที่เก็บไว้ ถ้าถูกต้องจะคืน payload ที่ pending ไว้ และลบ key ทิ้งทันที (กัน replay)
   */
  async verify(email: string, otp: string): Promise<Record<string, any> | null> {
    const otpKey = `register:otp:${email}`;
    const payloadKey = `register:pending:${email}`;

    const storedOtp = await this.redis.get(otpKey);
    if (!storedOtp || storedOtp !== otp) {
      return null;
    }

    const payloadRaw = await this.redis.get(payloadKey);
    if (!payloadRaw) {
      return null;
    }

    await this.redis.del(otpKey);
    await this.redis.del(payloadKey);

    return JSON.parse(payloadRaw);
  }
}