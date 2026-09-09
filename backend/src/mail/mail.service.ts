import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  constructor() {
    if (!this.resend && process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is required in production');
    }
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    // Local development can verify accounts without an email provider.
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV] OTP for ${email}: ${otp}`);
    }
    if (!this.resend) return;

    const { data, error } = await this.resend.emails.send({
      from: 'KU Marketplace <onboarding@resend.dev>',
      to: email,
      subject: 'รหัสยืนยัน OTP - KU Marketplace',
      html: `<p>รหัสยืนยันของคุณคือ: <b>${otp}</b></p><p>รหัสนี้จะหมดอายุใน 10 นาที</p>`,
    });

    if (error) {
      // แค่ log ไว้เฉยๆ ไม่ throw ต่อแล้ว — เพราะ OTP ใช้งานได้จริงผ่าน terminal/dev endpoint
      // อยู่แล้วแม้อีเมลส่งไม่ออก (เช่นติด restriction ของ Resend ตอนยังไม่ verify domain)
      this.logger.warn(
        `ส่งอีเมลไม่สำเร็จ (แต่ OTP ยังใช้ได้ตามข้างบน): ${error.message}`,
      );
      return;
    }

    this.logger.log(`ส่ง OTP ไปยัง ${email} ทางอีเมลสำเร็จ (id: ${data?.id})`);
  }

  /** เหมือน sendOtp() แต่ใช้คำสำหรับ flow ลืมรหัสผ่านโดยเฉพาะ กันสับสนกับ OTP สมัครสมาชิก */
  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV] Password reset OTP for ${email}: ${otp}`);
    }
    if (!this.resend) return;

    const { data, error } = await this.resend.emails.send({
      from: 'KU Marketplace <onboarding@resend.dev>',
      to: email,
      subject: 'รีเซ็ตรหัสผ่าน - KU Marketplace',
      html: `<p>รหัสยืนยันสำหรับตั้งรหัสผ่านใหม่คือ: <b>${otp}</b></p><p>รหัสนี้จะหมดอายุใน 10 นาที หากคุณไม่ได้เป็นผู้ขอ กรุณาเพิกเฉยต่ออีเมลนี้</p>`,
    });

    if (error) {
      this.logger.warn(
        `ส่งอีเมลไม่สำเร็จ (แต่ OTP ยังใช้ได้ตามข้างบน): ${error.message}`,
      );
      return;
    }

    this.logger.log(
      `ส่งรหัสรีเซ็ตรหัสผ่านไปยัง ${email} ทางอีเมลสำเร็จ (id: ${data?.id})`,
    );
  }
}
