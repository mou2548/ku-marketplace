import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  async sendOtp(email: string, otp: string): Promise<void> {
    // เอา OTP ขึ้น terminal เสมอ ไม่ว่าส่งอีเมลจะสำเร็จหรือไม่ — สะดวกตอน dev/test
    // (Resend ตัวฟรีที่ยังไม่ verify domain ส่งได้แค่หาอีเมลเจ้าของบัญชีเท่านั้น)
    this.logger.log(`[DEV] OTP สำหรับ ${email} คือ ${otp}`);

    const { data, error } = await this.resend.emails.send({
      from: 'KU Marketplace <onboarding@resend.dev>',
      to: email,
      subject: 'รหัสยืนยัน OTP - KU Marketplace',
      html: `<p>รหัสยืนยันของคุณคือ: <b>${otp}</b></p><p>รหัสนี้จะหมดอายุใน 10 นาที</p>`,
    });

    if (error) {
      // แค่ log ไว้เฉยๆ ไม่ throw ต่อแล้ว — เพราะ OTP ใช้งานได้จริงผ่าน terminal/dev endpoint
      // อยู่แล้วแม้อีเมลส่งไม่ออก (เช่นติด restriction ของ Resend ตอนยังไม่ verify domain)
      this.logger.warn(`ส่งอีเมลไม่สำเร็จ (แต่ OTP ยังใช้ได้ตามข้างบน): ${error.message}`);
      return;
    }

    this.logger.log(`ส่ง OTP ไปยัง ${email} ทางอีเมลสำเร็จ (id: ${data?.id})`);
  }

  /** เหมือน sendOtp() แต่ใช้คำสำหรับ flow ลืมรหัสผ่านโดยเฉพาะ กันสับสนกับ OTP สมัครสมาชิก */
  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    this.logger.log(`[DEV] รหัสรีเซ็ตรหัสผ่านสำหรับ ${email} คือ ${otp}`);

    const { data, error } = await this.resend.emails.send({
      from: 'KU Marketplace <onboarding@resend.dev>',
      to: email,
      subject: 'รีเซ็ตรหัสผ่าน - KU Marketplace',
      html: `<p>รหัสยืนยันสำหรับตั้งรหัสผ่านใหม่คือ: <b>${otp}</b></p><p>รหัสนี้จะหมดอายุใน 10 นาที หากคุณไม่ได้เป็นผู้ขอ กรุณาเพิกเฉยต่ออีเมลนี้</p>`,
    });

    if (error) {
      this.logger.warn(`ส่งอีเมลไม่สำเร็จ (แต่ OTP ยังใช้ได้ตามข้างบน): ${error.message}`);
      return;
    }

    this.logger.log(`ส่งรหัสรีเซ็ตรหัสผ่านไปยัง ${email} ทางอีเมลสำเร็จ (id: ${data?.id})`);
  }
}
