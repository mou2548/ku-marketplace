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

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const otp = await this.otpService.createAndStore(payload.email, {
      email: payload.email,
      passwordHash,
      phoneNumber: payload.phone ?? null,
    });

    await this.mailService.sendOtp(payload.email, otp);

    return { message: 'ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณายืนยันภายใน 10 นาที' };
  }

  /**
   * ⚠️ firstNameTh / lastNameTh เป็น NOT NULL ใน schema จริง
   * แต่ flow นี้ยังไม่เก็บชื่อไทยตอนสมัคร — ใส่ placeholder ว่างไปก่อน
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
        passwordHash: pending.passwordHash,
        phoneNumber: pending.phoneNumber,
        firstNameEn,
        lastNameEn: '',
        firstNameTh: '',
        lastNameTh: '',
        emailVerifiedAt: new Date(),
      },
      select: {
        userId: true,
        email: true,
        firstNameEn: true,
        isAdmin: true,
      },
    });

    await this.prisma.subscription.create({
      data: { userId: user.userId, tier: 'Free', status: 'Active', startDate: new Date() },
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

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const tokenUser = { userId: user.userId, email: user.email, isAdmin: user.isAdmin };
    const accessToken = this.tokenService.generateAccessToken(tokenUser);
    const refreshToken = this.tokenService.generateRefreshToken(tokenUser);

    return {
      user: {
        userId: user.userId,
        email: user.email,
        firstNameEn: user.firstNameEn,
        isAdmin: user.isAdmin,
      },
      accessToken,
      refreshToken,
    };
  }
}