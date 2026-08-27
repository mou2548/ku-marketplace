import { Controller, Post, Get, Body, Query, Res, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import {
  RequestOtpDto,
  VerifyOtpDto,
  LoginDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

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

  // §rename — เดิมคือ /auth/register/request-otp ย้ายมาตาม spec (path เก่าหายไป)
  @Post('register')
  @ResponseMessage('ส่งรหัส OTP ไปยังอีเมลแล้ว กรุณายืนยันภายใน 10 นาที')
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestRegisterOtp(dto);
  }

  // §rename — เดิมคือ /auth/register/verify-otp ย้ายมาตาม spec (path เก่าหายไป)
  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res) {
    const { user, accessToken, refreshToken } = await this.authService.verifyRegisterOtp(
      dto.email,
      dto.otp,
    );

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

    return { user, accessToken };
  }

  @Post('otp/resend')
  @ResponseMessage('ส่งรหัส OTP ใหม่ไปยังอีเมลแล้ว กรุณายืนยันภายใน 10 นาที')
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendRegisterOtp(dto.email);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto);

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

    return { user, accessToken };
  }

  /**
   * §logout — ระบบ auth นี้เป็น stateless JWT ล้วน ไม่มี refresh-token store/blacklist
   * ฝั่ง server (ไม่มีตาราง RefreshToken ใน DB) เพราะงั้น "logout" ที่ทำได้จริงคือ
   * เคลียร์ cookie ฝั่ง client เท่านั้น — access token เดิมที่ client อาจถืออยู่นอก
   * cookie (เช่นเก็บใน memory ของ frontend) จะยังใช้งานได้จนกว่าจะหมดอายุเอง (15 นาที)
   * ถ้าต้องการ revoke ทันทีจริงๆ ต้องเพิ่ม token blacklist ใน Redis ซึ่งเป็นคนละงานกับที่คุยกันไว้
   */
  @Post('logout')
  @ResponseMessage('ออกจากระบบสำเร็จ')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
    return {};
  }

  @Post('password/forgot')
  @ResponseMessage(
    'หากอีเมลนี้ลงทะเบียนไว้ในระบบ เราได้ส่งรหัสยืนยันไปให้แล้ว กรุณาตรวจสอบอีเมลภายใน 10 นาที',
  )
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('password/reset')
  @ResponseMessage('ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * ⚠️ DEV ONLY — ดึง OTP ปัจจุบันของอีเมลนี้กลับมาดู (ไม่ลบทิ้ง ต่างจาก verify)
   * ปิดตัวเองอัตโนมัติถ้า NODE_ENV=production กันหลุดขึ้น production จริง
   * ใช้กับ test console เท่านั้น ห้ามลืมลบออกก่อน deploy จริงถ้าไม่มั่นใจเรื่อง env var
   * `purpose=password-reset` ดู OTP ฝั่งลืมรหัสผ่านแทน (default คือฝั่งสมัครสมาชิก)
   */
  @Get('dev/last-otp')
  async getLastOtpForDev(
    @Query('email') email: string,
    @Query('purpose') purpose?: string,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('endpoint นี้ปิดใช้งานใน production');
    }
    const otp =
      purpose === 'password-reset'
        ? await this.otpService.peekPasswordResetOtp(email)
        : await this.otpService.peekOtp(email);
    if (!otp) {
      throw new NotFoundException('ไม่พบ OTP ที่ยังไม่หมดอายุสำหรับอีเมลนี้ — ลองขอ OTP ใหม่ก่อน');
    }
    return { email, otp };
  }
}
