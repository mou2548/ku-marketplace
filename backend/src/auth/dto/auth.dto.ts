import { createZodDto } from 'nestjs-zod';
import { requestOtpSchema, verifyOtpSchema, loginSchema } from '../validation/register.validation';

export class RequestOtpDto extends createZodDto(requestOtpSchema) {}
export class VerifyOtpDto extends createZodDto(verifyOtpSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
