import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: number) {
    return this.prisma.transaction.findMany({
      where: {
        OR: [{ buyer_id: userId }, { seller_id: userId }],
      },
      orderBy: { created_at: 'desc' },
    });
  }

  private async findOneOrThrow(transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transaction_id: transactionId },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }
    return transaction;
  }

  async findOneForUser(transactionId: number, userId: number) {
    const transaction = await this.findOneOrThrow(transactionId);
    if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
      throw new ForbiddenException('You are not a party to this transaction');
    }
    return transaction;
  }
}
