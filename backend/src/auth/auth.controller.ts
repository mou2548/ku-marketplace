import { Controller, Post, Get, Body, Query, Res, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { RequestOtpDto, VerifyOtpDto, LoginDto } from './dto/auth.dto';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private otpService: OtpService,
  ) {}

  @Post('register/request-otp')
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestRegisterOtp(dto);
  }

  @Post('register/verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res) {
    const { user, accessToken, refreshToken } = await this.authService.verifyRegisterOtp(
      dto.email,
      dto.otp,
    );

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

    return { user, accessToken };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto);

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

    return { user, accessToken };
  }

  /**
   * ⚠️ DEV ONLY — ดึง OTP ปัจจุบันของอีเมลนี้กลับมาดู (ไม่ลบทิ้ง ต่างจาก verify)
   * ปิดตัวเองอัตโนมัติถ้า NODE_ENV=production กันหลุดขึ้น production จริง
   * ใช้กับ test console เท่านั้น ห้ามลืมลบออกก่อน deploy จริงถ้าไม่มั่นใจเรื่อง env var
   */
  @Get('dev/last-otp')
  async getLastOtpForDev(@Query('email') email: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('endpoint นี้ปิดใช้งานใน production');
    }
    const otp = await this.otpService.peekOtp(email);
    if (!otp) {
      throw new NotFoundException('ไม่พบ OTP ที่ยังไม่หมดอายุสำหรับอีเมลนี้ — ลองขอ OTP ใหม่ก่อน');
    }
    return { email, otp };
  }
}
