import { Injectable, Logger } from '@nestjs/common';


@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendOtp(email: string, otp: string): Promise<void> {
    this.logger.log(`[DEV ONLY] ส่ง OTP ${otp} ไปยัง ${email}`);
  }
}