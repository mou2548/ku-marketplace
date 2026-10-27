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
import type {
  RequestOtpPayload,
  LoginPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from './validation/register.validation';
import { liftExpiredSuspension } from '../report/account-standing';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otpService: OtpService,
    private tokenService: TokenService,
    private mailService: MailService,
  ) {}

  async requestRegisterOtp(payload: RequestOtpPayload) {
    const existing = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
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

    return { email: payload.email };
  }

  /** §resend — ออก OTP ใหม่ให้คำขอสมัครที่ยัง pending อยู่ (ไม่สร้างคำขอใหม่) */
  async resendRegisterOtp(email: string) {
    const otp = await this.otpService.resendRegisterOtp(email);
    await this.mailService.sendOtp(email, otp);
    return { email };
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
        subscriptions: {
          create: { tier: 'Free', status: 'Active', startDate: new Date() },
        },
      },
      select: {
        userId: true,
        email: true,
        firstNameEn: true,
        isAdmin: true,
        passwordHash: true,
      },
    });

    const tokens = await this.tokenService.createSession(user);
    return {
      user: {
        userId: user.userId,
        email: user.email,
        firstNameEn: user.firstNameEn,
        isAdmin: user.isAdmin,
      },
      ...tokens,
    };
  }

  /**
   * Login ด้วย email + password ตรงๆ สำหรับ user ที่สมัคร (verify OTP) ไปแล้ว
   */
  async login(payload: LoginPayload) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const passwordMatches = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    // Restricted accounts can sign in to appeal; JwtAuthGuard blocks marketplace actions.
    const allowedStatuses = new Set(['Active', 'Suspended', 'Banned']);
    user.status = await liftExpiredSuspension(this.prisma, user);
    if (!allowedStatuses.has(user.status ?? '')) {
      throw new UnauthorizedException('บัญชีนี้ถูกลบไปแล้ว');
    }

    const tokenUser = {
      userId: user.userId,
      email: user.email,
      isAdmin: user.isAdmin,
    };
    const tokens = await this.tokenService.createSession({
      ...tokenUser,
      passwordHash: user.passwordHash,
    });

    return {
      user: {
        userId: user.userId,
        email: user.email,
        firstNameEn: user.firstNameEn,
        status: user.status,
        isAdmin: user.isAdmin,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { userId: payload.userId },
    });
    const allowedStatuses = new Set(['Active', 'Suspended', 'Banned']);
    if (!user || !allowedStatuses.has(user.status ?? '')) {
      await this.tokenService.revoke(refreshToken);
      throw new UnauthorizedException('Account is not available');
    }
    return this.tokenService.refresh(refreshToken, user);
  }

  async logout(refreshToken?: string) {
    if (refreshToken) await this.tokenService.revoke(refreshToken);
  }

  /**
   * §password-forgot — ส่ง OTP รีเซ็ตรหัสผ่าน "เสมอ" ไม่ว่าอีเมลนี้จะมีอยู่จริงหรือไม่
   * (ตอบข้อความเดียวกันทั้งสองกรณี) กันไม่ให้ endpoint นี้ถูกใช้เดาว่าอีเมลไหน
   * ลงทะเบียนไว้บ้าง (email enumeration)
   */
  async forgotPassword(payload: ForgotPasswordPayload) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (user && user.status === 'Active') {
      const otp = await this.otpService.createPasswordResetOtp(payload.email);
      await this.mailService.sendPasswordResetOtp(payload.email, otp);
    }
    return { email: payload.email };
  }

  async resetPassword(payload: ResetPasswordPayload) {
    const otpValid = await this.otpService.verifyPasswordResetOtp(
      payload.email,
      payload.otp,
    );
    if (!otpValid) {
      throw new BadRequestException('OTP ไม่ถูกต้องหรือหมดอายุแล้ว');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (!user) {
      // ไม่ควรเกิดขึ้นจริง (OTP ถูก issue จาก forgotPassword ที่เช็ค user มาก่อนแล้ว)
      // แต่กันไว้เผื่อ user ถูกลบไประหว่างที่ OTP ยังไม่หมดอายุ
      throw new BadRequestException('ไม่พบบัญชีผู้ใช้สำหรับอีเมลนี้');
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 10);
    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { passwordHash },
    });

    return { email: payload.email };
  }
}
