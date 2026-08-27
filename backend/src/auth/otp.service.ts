import { Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * ออก OTP ใหม่ให้คำขอสมัครที่ pending อยู่แล้ว (ไม่สร้าง payload ใหม่ ใช้ของเดิม
   * ที่ยังไม่หมดอายุ) ต่างจาก createAndStore() ตรงที่ไม่รับ payload ใหม่ — ถ้าไม่มี
   * pending อยู่เลย (หมดอายุไปแล้ว/ไม่เคยขอ) ให้ผู้ใช้กลับไปเริ่ม request-otp ใหม่
   */
  async resendRegisterOtp(email: string): Promise<string> {
    const payloadKey = `register:pending:${email}`;
    const payloadRaw = await this.redis.get(payloadKey);
    if (!payloadRaw) {
      throw new NotFoundException(
        'ไม่พบคำขอสมัครสมาชิกที่รอการยืนยัน กรุณาเริ่มสมัครใหม่',
      );
    }

    const otp = this.generateCode();
    await this.redis.setex(`register:otp:${email}`, OTP_TTL_SECONDS, otp);
    // ต่ออายุ payload ให้ตรงกับ TTL ของ OTP ใหม่ด้วย ไม่งั้น payload อาจหมดอายุ
    // ก่อน OTP ที่เพิ่งออกใหม่
    await this.redis.setex(payloadKey, OTP_TTL_SECONDS, payloadRaw);

    return otp;
  }

  /**
   * §password-reset — คนละ namespace กับ OTP สมัครสมาชิก (`password-reset:otp:*`
   * vs `register:otp:*`) กันชนกันถ้า user ขอทั้งสองอย่างพร้อมกัน ไม่ต้อง pending
   * payload เหมือนฝั่งสมัคร เพราะ user มีอยู่แล้วใน DB — reset แค่ต้องพิสูจน์ว่า
   * เป็นเจ้าของอีเมลจริงผ่าน OTP เท่านั้น
   */
  async createPasswordResetOtp(email: string): Promise<string> {
    const otp = this.generateCode();
    await this.redis.setex(`password-reset:otp:${email}`, OTP_TTL_SECONDS, otp);
    return otp;
  }

  /** ตรวจ OTP รีเซ็ตรหัสผ่าน ถ้าถูกต้องลบทิ้งทันที (กัน replay เหมือน verify() ฝั่งสมัคร) */
  async verifyPasswordResetOtp(email: string, otp: string): Promise<boolean> {
    const key = `password-reset:otp:${email}`;
    const stored = await this.redis.get(key);
    if (!stored || stored !== otp) {
      return false;
    }
    await this.redis.del(key);
    return true;
  }

  /**
   * ⚠️ DEV ONLY — อ่าน OTP ปัจจุบันโดยไม่ลบทิ้ง (ต่างจาก verify())
   * ใช้สำหรับ test console เท่านั้น ห้ามเปิด endpoint นี้ใน production เด็ดขาด
   * (ดู guard ที่ auth.controller.ts — เช็ค NODE_ENV ก่อนเรียกเสมอ)
   */
  async peekOtp(email: string): Promise<string | null> {
    return this.redis.get(`register:otp:${email}`);
  }

  /** เหมือน peekOtp() แต่สำหรับ OTP รีเซ็ตรหัสผ่าน — ใช้กับ dev endpoint เดียวกัน */
  async peekPasswordResetOtp(email: string): Promise<string | null> {
    return this.redis.get(`password-reset:otp:${email}`);
  }
}
