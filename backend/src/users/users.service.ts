import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PROFILE_SELECT = {
  userId: true,
  email: true,
  firstNameEn: true,
  lastNameEn: true,
  firstNameTh: true,
  lastNameTh: true,
  phoneNumber: true,
  status: true,
  emailVerifiedAt: true,
  isAdmin: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * JwtAuthGuard ผ่านมาแล้วแปลว่า token valid ตอนออก แต่ user อาจถูกลบ/ระงับไปหลังจากนั้น
   * ก็ได้ (ไม่มี token blacklist ในระบบนี้ — ดู comment ที่ auth.controller.ts logout())
   * เช็ค findUnique + throw เองแทน findUniqueOrThrow เพื่อให้ได้ 404 ที่ถูกต้อง
   * แทน Prisma error ดิบๆ
   */
  async findMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: PROFILE_SELECT,
    });
    if (!user) {
      throw new NotFoundException('ไม่พบบัญชีผู้ใช้');
    }
    return user;
  }

  async updateMe(userId: number, dto: UpdateProfileDto) {
    await this.findMe(userId); // 404 ถ้าบัญชีถูกลบไปแล้ว แทนที่จะแก้ไขบัญชีที่ไม่มีอยู่จริง

    return this.prisma.user.update({
      where: { userId },
      data: {
        firstNameEn: dto.first_name_en,
        lastNameEn: dto.last_name_en,
        firstNameTh: dto.first_name_th,
        lastNameTh: dto.last_name_th,
        phoneNumber: dto.phone_number,
      },
      select: PROFILE_SELECT,
    });
  }

  /**
   * §soft-delete — User ไม่มี deletedAt แยกแบบ Item/Post เพราะ init.sql ออกแบบ
   * user_status ให้มีค่า 'Deleted' อยู่แล้วตั้งแต่ต้น (เห็นได้จาก CHECK constraint)
   * แค่ยังไม่เคยมี endpoint ไหนเซ็ตมันจริงๆ เท่านั้น login() เช็ค status !== 'Active'
   * อยู่แล้ว ทำให้บัญชีที่ลบไปแล้ว login ไม่ได้อีกทันที
   */
  async deleteMe(userId: number) {
    const user = await this.findMe(userId);
    if (user.status === 'Deleted') {
      throw new ConflictException('บัญชีนี้ถูกลบไปแล้ว');
    }

    await this.prisma.user.update({
      where: { userId },
      data: { status: 'Deleted' },
    });

    return { userId, status: 'Deleted' };
  }
}
