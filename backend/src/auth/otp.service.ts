import { randomInt } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const OTP_TTL_SECONDS = 10 * 60;

@Injectable()
export class OtpService {
  constructor(private redis: RedisService) {}

  private generateCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  /**
   * สร้าง OTP และเก็บ payload ที่รอยืนยัน (email/password/phone) ไว้ใน Redis ชั่วคราว
   * ยังไม่สร้าง User จริงใน DB จนกว่าจะ verify สำเร็จ (กัน "ผู้ใช้ขยะ" ค้างตาราง)
   */
  async createAndStore(email: string, pendingPayload: object): Promise<string> {
    const otp = this.generateCode();
    const otpKey = `register:otp:${email}`;
    const payloadKey = `register:pending:${email}`;

    await this.redis
      .multi()
      .setex(otpKey, OTP_TTL_SECONDS, otp)
      .setex(payloadKey, OTP_TTL_SECONDS, JSON.stringify(pendingPayload))
      .exec();

    return otp;
  }

  /**
   * ตรวจสอบ OTP กับที่เก็บไว้ ถ้าถูกต้องจะคืน payload ที่ pending ไว้ และลบ key ทิ้งทันที (กัน replay)
   */
  async verify(
    email: string,
    otp: string,
  ): Promise<{
    email: string;
    passwordHash: string;
    phoneNumber?: string | null;
  } | null> {
    const payload = await this.redis.eval(
      `
      if redis.call('get', KEYS[1]) ~= ARGV[1] then return nil end
      local payload = redis.call('get', KEYS[2])
      if not payload then return nil end
      redis.call('del', KEYS[1], KEYS[2])
      return payload
    `,
      2,
      `register:otp:${email}`,
      `register:pending:${email}`,
      otp,
    );
    return typeof payload === 'string'
      ? (JSON.parse(payload) as {
          email: string;
          passwordHash: string;
          phoneNumber?: string | null;
        })
      : null;
  }

  /**
   * ออก OTP ใหม่ให้คำขอสมัครที่ pending อยู่แล้ว (ไม่สร้าง payload ใหม่ ใช้ของเดิม
   * ที่ยังไม่หมดอายุ) ต่างจาก createAndStore() ตรงที่ไม่รับ payload ใหม่ — ถ้าไม่มี
   * pending อยู่เลย (หมดอายุไปแล้ว/ไม่เคยขอ) ให้ผู้ใช้กลับไปเริ่ม request-otp ใหม่
   */
  async resendRegisterOtp(email: string): Promise<string> {
    const otp = this.generateCode();
    const updated = await this.redis.eval(
      `
      if redis.call('exists', KEYS[2]) == 0 then return 0 end
      redis.call('setex', KEYS[1], ARGV[2], ARGV[1])
      redis.call('expire', KEYS[2], ARGV[2])
      return 1
    `,
      2,
      `register:otp:${email}`,
      `register:pending:${email}`,
      otp,
      OTP_TTL_SECONDS,
    );
    if (updated !== 1)
      throw new NotFoundException('Registration request expired; start again');
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
    const consumed = await this.redis.eval(
      `
      if redis.call('get', KEYS[1]) ~= ARGV[1] then return 0 end
      return redis.call('del', KEYS[1])
    `,
      1,
      `password-reset:otp:${email}`,
      otp,
    );
    return consumed === 1;
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
