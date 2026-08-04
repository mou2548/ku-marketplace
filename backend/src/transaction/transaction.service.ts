import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Transaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  DeliveryMethod,
  ItemStatus,
  TransactionStatus,
} from '../common/enums/transaction.enums';
import { UploadPaymentSlipDto } from './dto/upload-payment-slip.dto';
import { ShipTransactionDto } from './dto/ship-transaction.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { UploadRefundSlipDto } from './dto/upload-refund-slip.dto';

type TransactionRow = Transaction;

/** §6 Redis key pattern + §8.6 "อายุ token 15 นาที" */
const QR_TOKEN_TTL_SECONDS = 15 * 60;
const qrTokenKey = (transactionId: number) => `qr_token:${transactionId}`;

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  findAllForUser(userId: number) {
    return this.prisma.transaction.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOneOrThrow(transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }
    return transaction;
  }

  async findOneForUser(transactionId: number, userId: number) {
    const transaction = await this.findOneOrThrow(transactionId);
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenException('You are not a party to this transaction');
    }
    return transaction;
  }

  private assertIsBuyer(transaction: TransactionRow, userId: number) {
    if (transaction.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can perform this action');
    }
  }

  private assertIsSeller(transaction: TransactionRow, userId: number) {
    if (transaction.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can perform this action');
    }
  }

  private assertStatus(
    transaction: TransactionRow,
    expected: TransactionStatus,
  ) {
    if (transaction.status !== expected) {
      throw new BadRequestException(
        `Transaction ${transaction.transactionId} must be ${expected} to do this (current: ${transaction.status})`,
      );
    }
  }

  /**
   * §8.7 — once either party asks to cancel, the confirm buttons stay locked
   * until that request is answered or an admin rules on the dispute. Without
   * this a party could race a pending cancellation by confirming anyway.
   */
  private assertNoPendingCancellation(transaction: TransactionRow) {
    if (transaction.cancellationRequestedBy !== null) {
      throw new BadRequestException(
        'A cancellation request is pending on this transaction — resolve it first',
      );
    }
  }

  /**
   * §8.6 step 1 — the buyer transfers money off-platform, uploads the slip and
   * confirms. That moves the transaction Pending → Processing. The platform
   * only records that the buyer says they paid; it never moves money itself.
   */
  async uploadPaymentSlip(
    transactionId: number,
    userId: number,
    dto: UploadPaymentSlipDto,
  ) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsBuyer(transaction, userId);
    this.assertStatus(transaction, TransactionStatus.Pending);

    return this.prisma.transaction.update({
      where: { transactionId },
      data: {
        slipImageUrl: dto.slip_image_url,
        paymentConfirmedByBuyerAt: new Date(),
        status: TransactionStatus.Processing,
      },
    });
  }

  /**
   * §8.6 step 2 — the seller checks the slip against their bank and confirms
   * receipt. This is only the FIRST of the two conditions for Completed; the
   * item still has to be confirmed as received (delivery/QR flow), so the
   * status stays Processing here.
   */
  async confirmPaymentReceived(transactionId: number, userId: number) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsSeller(transaction, userId);
    this.assertStatus(transaction, TransactionStatus.Processing);
    this.assertNoPendingCancellation(transaction);

    if (transaction.paymentConfirmedBySellerAt) {
      throw new BadRequestException(
        'Payment receipt has already been confirmed',
      );
    }

    return this.prisma.transaction.update({
      where: { transactionId },
      data: { paymentConfirmedBySellerAt: new Date() },
    });
  }

  private assertDeliveryMethod(
    transaction: TransactionRow,
    expected: DeliveryMethod,
  ) {
    if (transaction.deliveryMethod !== expected) {
      throw new BadRequestException(
        `This endpoint is only for ${expected} transactions (this one is ${transaction.deliveryMethod})`,
      );
    }
  }

  /**
   * §8.6 Shipping step 1 — once the money has landed, the seller posts the
   * parcel and records the tracking number. Still Processing: handing the
   * parcel to a courier is not the buyer receiving it.
   */
  async ship(transactionId: number, userId: number, dto: ShipTransactionDto) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsSeller(transaction, userId);
    this.assertDeliveryMethod(transaction, DeliveryMethod.Shipping);
    this.assertStatus(transaction, TransactionStatus.Processing);
    this.assertNoPendingCancellation(transaction);

    if (!transaction.paymentConfirmedBySellerAt) {
      throw new BadRequestException(
        'Confirm the payment was received before shipping',
      );
    }

    return this.prisma.transaction.update({
      where: { transactionId },
      data: {
        trackingNumber: dto.tracking_number,
        estimatedDeliveryDate: new Date(dto.estimated_delivery_date),
      },
    });
  }

  /**
   * Closes out a transaction once BOTH §8.6 conditions hold — the seller has
   * confirmed the money and the buyer has confirmed the goods. Shared by the
   * shipping and the meetup/QR paths, which differ only in how the buyer
   * confirms receipt.
   *
   * Runs in one Prisma transaction so a Completed row can never exist while its
   * item is still Listed.
   */
  private async confirmItemReceived(transactionId: number) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { transactionId },
        data: { itemReceivedConfirmedByBuyerAt: new Date() },
      });

      if (!updated.paymentConfirmedBySellerAt) {
        return updated;
      }

      const completed = await tx.transaction.update({
        where: { transactionId },
        data: { status: TransactionStatus.Completed },
      });

      // §8.2 — ownership has moved, so the item leaves the marketplace.
      const post = await tx.post.findUnique({
        where: { postId: completed.postId },
        select: { itemId: true },
      });
      if (post) {
        await tx.item.update({
          where: { itemId: post.itemId },
          data: { status: ItemStatus.Transferred },
        });
      }

      return completed;
    });
  }

  /**
   * §8.6 Shipping step 2 — the buyer confirms the parcel arrived. This is the
   * second condition, so it usually completes the transaction. The spec warns
   * this is irreversible, which is why the UI must gate it behind a
   * confirmation screen separate from the "track parcel" button.
   */
  async confirmDelivery(transactionId: number, userId: number) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsBuyer(transaction, userId);
    this.assertDeliveryMethod(transaction, DeliveryMethod.Shipping);
    this.assertStatus(transaction, TransactionStatus.Processing);
    this.assertNoPendingCancellation(transaction);

    if (!transaction.trackingNumber) {
      throw new BadRequestException(
        'The seller has not shipped this transaction yet',
      );
    }
    if (transaction.itemReceivedConfirmedByBuyerAt) {
      throw new BadRequestException('Delivery has already been confirmed');
    }

    return this.confirmItemReceived(transactionId);
  }

  /**
   * §8.6 Meetup — the seller shows a QR on screen and the buyer scans it, which
   * is what proves the goods actually changed hands in person. The direction
   * matters: the seller holds it, the buyer scans, so only a buyer physically
   * present can complete the handover.
   *
   * The token is random and stored in Redis (not in the QR payload and not in
   * Postgres) so it expires by itself and carries no personal data. Generating
   * again replaces the previous token — that is the "refresh" path for an
   * expired code.
   */
  async generateQr(transactionId: number, userId: number) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsSeller(transaction, userId);
    this.assertDeliveryMethod(transaction, DeliveryMethod.Meetup);
    this.assertStatus(transaction, TransactionStatus.Processing);
    this.assertNoPendingCancellation(transaction);

    if (!transaction.paymentConfirmedBySellerAt) {
      throw new BadRequestException(
        'Confirm the payment was received before handing over the item',
      );
    }
    if (transaction.itemReceivedConfirmedByBuyerAt) {
      throw new BadRequestException('This item has already been handed over');
    }

    const token = randomBytes(32).toString('hex');
    await this.redis.set(
      qrTokenKey(transactionId),
      token,
      'EX',
      QR_TOKEN_TTL_SECONDS,
    );

    const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
    return {
      token,
      // What the QR image should encode: a plain link the buyer's camera app
      // can open, which then asks them to confirm once more before anything
      // changes (§8.6 "สแกนแล้วต้องกดยืนยันซ้ำ").
      url: `${baseUrl}/transactions/${transactionId}/confirm-receipt?token=${token}`,
      expiresInSeconds: QR_TOKEN_TTL_SECONDS,
    };
  }

  /**
   * The confirm step after scanning. Single-use: the token is deleted before
   * the status changes, so a replayed scan cannot complete the transaction
   * twice. No GPS check — being able to read the other party's screen is the
   * proximity proof (§8.6).
   */
  async scanQr(transactionId: number, userId: number, dto: ScanQrDto) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsBuyer(transaction, userId);
    this.assertDeliveryMethod(transaction, DeliveryMethod.Meetup);
    this.assertStatus(transaction, TransactionStatus.Processing);
    this.assertNoPendingCancellation(transaction);

    if (transaction.itemReceivedConfirmedByBuyerAt) {
      throw new BadRequestException('This item has already been handed over');
    }

    const key = qrTokenKey(transactionId);
    const storedToken = await this.redis.get(key);
    if (!storedToken) {
      throw new BadRequestException(
        'QR code has expired — ask the seller to show a new one',
      );
    }
    if (storedToken !== dto.token) {
      throw new BadRequestException('Invalid QR code for this transaction');
    }

    await this.redis.del(key);
    return this.confirmItemReceived(transactionId);
  }

  /**
   * Both refund endpoints are evidence-tracking ONLY (§10 open issue #2).
   *
   * The platform never holds or moves user money (§1 rule 1), so these do not
   * transfer anything, do not change `status`, and give no one the power to
   * force a refund. They record that the two parties settled it themselves, so
   * that if the money never actually arrives the buyer has something concrete
   * to attach to a report (§8.7).
   *
   * Deliberately restricted to Cancelled transactions where the buyer had
   * already paid — that is the only situation §8.7 describes. If the team later
   * wants to record refunds after Completed too, relax this one check.
   */
  private assertRefundable(transaction: TransactionRow) {
    this.assertStatus(transaction, TransactionStatus.Cancelled);
    if (!transaction.paymentConfirmedByBuyerAt) {
      throw new BadRequestException(
        'No payment was ever made on this transaction, so there is nothing to refund',
      );
    }
  }

  /** Seller records proof they sent the money back. Status is untouched. */
  async uploadRefundSlip(
    transactionId: number,
    userId: number,
    dto: UploadRefundSlipDto,
  ) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsSeller(transaction, userId);
    this.assertRefundable(transaction);

    return this.prisma.transaction.update({
      where: { transactionId },
      data: { refundSlipUrl: dto.refund_slip_url },
    });
  }

  /** Buyer acknowledges the money actually arrived. Status is untouched. */
  async confirmRefund(transactionId: number, userId: number) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsBuyer(transaction, userId);
    this.assertRefundable(transaction);

    if (!transaction.refundSlipUrl) {
      throw new BadRequestException(
        'The seller has not uploaded a refund slip yet',
      );
    }
    if (transaction.refundConfirmedByBuyer) {
      throw new BadRequestException('This refund has already been confirmed');
    }

    return this.prisma.transaction.update({
      where: { transactionId },
      data: { refundConfirmedByBuyer: true },
    });
  }
}
