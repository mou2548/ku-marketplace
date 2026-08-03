import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { MailService } from '../mail/mail.service';
import { extractFirstNameFromEmail } from '../common/utils/ku-email.util';
import type { RequestOtpPayload, LoginPayload } from './validation/register.validation';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private tokenService: TokenService,
    private mailService: MailService,
  ) {}

  async requestRegisterOtp(payload: RequestOtpPayload) {
    const existing = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      throw new ConflictException('อีเมลนี้เคยลงทะเบียนแล้ว');
    }

    const password_hash = await bcrypt.hash(payload.password, 10);

    const otp = await this.otpService.createAndStore(payload.email, {
      email: payload.email,
      password_hash,
      phone_number: payload.phone ?? null,
    });

    await this.mailService.sendOtp(payload.email, otp);

    return { message: 'ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณายืนยันภายใน 10 นาที' };
  }

  /**
   * ⚠️ first_name_th / last_name_th เป็น NOT NULL ใน schema จริง
   * แต่ flow นี้ยังไม่เก็บชื่อไทยตอนสมัคร — ใส่ placeholder ว่างไปก่อน
   * ควรคุยกับทีมว่าจะเปลี่ยนเป็น nullable หรือเพิ่มช่องกรอกตอนสมัครแทน
   */
  async verifyRegisterOtp(email: string, otp: string) {
    const pending = await this.otpService.verify(email, otp);
    if (!pending) {
      throw new BadRequestException('OTP ไม่ถูกต้องหรือหมดอายุแล้ว');
    }

    const firstNameEn = extractFirstNameFromEmail(email);

    const user = await this.prisma.user.create({
      data: {
        email,
        password_hash: pending.password_hash,
        phone_number: pending.phone_number,
        first_name_en: firstNameEn,
        last_name_en: '',
        first_name_th: '',
        last_name_th: '',
        email_verified_at: new Date(),
      },
      select: {
        user_id: true,
        email: true,
        first_name_en: true,
        isadmin: true,
      },
    });

    await this.prisma.subscription.create({
      data: { user_id: user.user_id, tier: 'Free', status: 'Active', start_date: new Date() },
    });

    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  /**
   * Login ด้วย email + password ตรงๆ สำหรับ user ที่สมัคร (verify OTP) ไปแล้ว
   */
  async login(payload: LoginPayload) {
    const user = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const tokenUser = { user_id: user.user_id, email: user.email, isadmin: user.isadmin };
    const accessToken = this.tokenService.generateAccessToken(tokenUser);
    const refreshToken = this.tokenService.generateRefreshToken(tokenUser);

    return {
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name_en: user.first_name_en,
        isadmin: user.isadmin,
      },
      accessToken,
      refreshToken,
    };
  }
}
