import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { normalizePromptPayId } from '../common/utils/promptpay';

const PROFILE_SELECT = {
  userId: true,
  email: true,
  firstNameEn: true,
  lastNameEn: true,
  firstNameTh: true,
  lastNameTh: true,
  phoneNumber: true,
  avatarUrl: true,
  // Only ever returned to its owner (this select backs /users/me alone).
  promptpayId: true,
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
        avatarUrl: dto.avatar_url,
        promptpayId: await this.resolvePromptPayId(userId, dto.promptpay_id),
      },
      select: PROFILE_SELECT,
    });
  }

  /** undefined leaves the stored ID alone; null clears it. */
  private async resolvePromptPayId(
    userId: number,
    input: string | null | undefined,
  ) {
    if (input === undefined) return undefined;
    if (input === null || input.trim() === '') {
      await this.assertCanClearPromptPay(userId);
      return null;
    }
    const promptpayId = normalizePromptPayId(input);
    if (!promptpayId) {
      throw new BadRequestException(
        'PromptPay ต้องเป็นเบอร์มือถือ 10 หลัก เช่น 0812345678',
      );
    }
    await this.assertPromptPayIsFree(userId, promptpayId);
    return promptpayId;
  }

  /**
   * One number, one account: a student has a single account, so a number
   * already on another one is a typo or a second account (a banned seller
   * coming back, say). A deleted account no longer holds its number.
   *
   * Checked here only — the column has no unique index, so two saves landing
   * at the same instant could still both pass.
   */
  private async assertPromptPayIsFree(userId: number, promptpayId: string) {
    const holder = await this.prisma.user.findFirst({
      where: {
        promptpayId,
        userId: { not: userId },
        OR: [{ status: null }, { status: { not: 'Deleted' } }],
      },
      select: { userId: true },
    });
    if (holder) {
      throw new ConflictException('เบอร์ PromptPay นี้ถูกใช้กับบัญชีอื่นแล้ว');
    }
  }

  /**
   * A buyer pays through a QR built from this ID, so it has to stay while
   * something of the user's can still be paid for: a listing with a price, or
   * a deal in progress that carries money.
   */
  private async assertCanClearPromptPay(userId: number) {
    const [sellingPosts, openDeals] = await Promise.all([
      this.prisma.post.count({
        where: {
          item: { ownerId: userId },
          postType: { in: ['SellOnly', 'Both'] },
          status: 'Active',
          deletedAt: null,
        },
      }),
      this.prisma.transaction.count({
        where: {
          sellerId: userId,
          status: { in: ['Pending', 'Processing'] },
          totalAmount: { gt: 0 },
        },
      }),
    ]);
    if (sellingPosts > 0 || openDeals > 0) {
      throw new ConflictException(
        'ยังลบ PromptPay ไม่ได้ เพราะมีโพสต์ขายหรือรายการซื้อขายที่ยังไม่จบ',
      );
    }
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
