import { z } from 'zod';
import { isValidKuEmail } from '../../common/utils/ku-email.util';

export const requestOtpSchema = z.object({
  email: z.string().email().refine(isValidKuEmail, {
    message:
      'ต้องใช้อีเมลมหาวิทยาลัยเกษตรศาสตร์ (@ku.th หรือ @ku.ac.th) เท่านั้น',
  }),
  password: z
    .string()
    .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .max(64, 'รหัสผ่านต้องไม่เกิน 64 ตัวอักษร')
    .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
      message: 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว',
    }),
  phone: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP ต้องมี 6 หลัก'),
});

// login ด้วย email+password ตรงๆ สำหรับ user ที่สมัคร (verify OTP) ไปแล้ว
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export const resendOtpSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const passwordRule = z
  .string()
  .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .max(64, 'รหัสผ่านต้องไม่เกิน 64 ตัวอักษร')
  .refine((val) => /[A-Za-z]/.test(val) && /\d/.test(val), {
    message: 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว',
  });

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP ต้องมี 6 หลัก'),
  newPassword: passwordRule,
});

export type RequestOtpPayload = z.infer<typeof requestOtpSchema>;
export type VerifyOtpPayload = z.infer<typeof verifyOtpSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;
export type ResendOtpPayload = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordPayload = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordPayload = z.infer<typeof resetPasswordSchema>;
