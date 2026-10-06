import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Prisma, Transaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  CancellationResponse,
  DeliveryMethod,
  TransactionStatus,
} from '../common/enums/transaction.enums';
import { ReportStatus, ReportType } from '../common/enums/report.enums';
import { UploadPaymentSlipDto } from './dto/upload-payment-slip.dto';
import { ShipTransactionDto } from './dto/ship-transaction.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { UploadRefundSlipDto } from './dto/upload-refund-slip.dto';
import { RequestCancellationDto } from './dto/request-cancellation.dto';
import { RespondCancellationDto } from './dto/respond-cancellation.dto';
import { notifyAdminsOfReport } from '../report/moderation-notifications';

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

  private serializeUserSummary(user: {
    userId: number;
    firstNameEn: string;
    lastNameEn: string;
    emailVerifiedAt: Date | null;
    avatarUrl?: string | null;
  }) {
    return {
      user_id: user.userId,
      name: `${user.firstNameEn} ${user.lastNameEn}`.trim(),
      isVerified: user.emailVerifiedAt !== null,
      avatar_url: user.avatarUrl ?? null,
    };
  }

  /**
   * Not a stored column — `Transaction` has no `final_amount`. A straight
   * purchase (`offer_id` null) pays the post's price; a trade only ever
   * carries the offer's `additional_money` top-up (`requiresPayment` in
   * `lib/status.ts` uses the same `offer_id == null` split on the frontend).
   */
  private finalAmount(transaction: {
    offerId: number | null;
    quantity: number | null;
    post: { price: { toNumber(): number } };
    offer: { additionalMoney: { toNumber(): number } | null } | null;
  }) {
    if (transaction.offerId === null) {
      return transaction.post.price.toNumber() * (transaction.quantity ?? 1);
    }
    return transaction.offer?.additionalMoney?.toNumber() ?? 0;
  }

  private serializeTransaction(transaction: {
    transactionId: number;
    postId: number;
    offerId: number | null;
    buyerId: number;
    sellerId: number;
    quantity: number | null;
    status: string | null;
    activeReportId: number | null;
    deliveryMethod: string;
    slipImageUrl: string | null;
    trackingNumber: string | null;
    estimatedDeliveryDate: Date | null;
    paymentConfirmedByBuyerAt: Date | null;
    paymentConfirmedBySellerAt: Date | null;
    itemReceivedConfirmedByBuyerAt: Date | null;
    itemReceivedConfirmedBySellerAt: Date | null;
    cancellationRequestedBy: number | null;
    cancellationReason: string | null;
    cancellationRequestedAt: Date | null;
    cancellationResponse: string | null;
    refundSlipUrl: string | null;
    refundSubmittedAt: Date | null;
    refundConfirmedByBuyer: boolean | null;
    itemReturnConfirmedAt: Date | null;
    createdAt: Date | null;
    post: {
      postId: number;
      itemId: number;
      postType: string;
      price: { toNumber(): number };
      quantityRemaining: number;
      createdAt: Date | null;
      item: {
        itemId: number;
        ownerId: number;
        name: string;
        category: string;
        condition: string;
        description: string | null;
        courseName: string | null;
        brandModel: string | null;
        warrantyExpiry: Date | null;
        size: string | null;
        createdAt: Date | null;
        images: {
          imageId: number;
          itemId: number;
          imageUrl: string;
          isPrimary: boolean | null;
          displayOrder: number | null;
        }[];
      };
    };
    offer: { additionalMoney: { toNumber(): number } | null } | null;
    buyer: {
      userId: number;
      firstNameEn: string;
      lastNameEn: string;
      emailVerifiedAt: Date | null;
    };
    seller: {
      userId: number;
      firstNameEn: string;
      lastNameEn: string;
      emailVerifiedAt: Date | null;
    };
  }) {
    const item = transaction.post.item;
    return {
      transaction_id: transaction.transactionId,
      post_id: transaction.postId,
      offer_id: transaction.offerId,
      buyer_id: transaction.buyerId,
      seller_id: transaction.sellerId,
      quantity: transaction.quantity,
      final_amount: this.finalAmount(transaction),
      status: transaction.status,
      delivery_method: transaction.deliveryMethod,
      active_report_id: transaction.activeReportId,
      slip_image_url: transaction.slipImageUrl,
      tracking_number: transaction.trackingNumber,
      estimated_delivery_date: transaction.estimatedDeliveryDate,
      payment_confirmed_by_buyer_at: transaction.paymentConfirmedByBuyerAt,
      payment_confirmed_by_seller_at: transaction.paymentConfirmedBySellerAt,
      item_received_confirmed_by_buyer_at:
        transaction.itemReceivedConfirmedByBuyerAt,
      item_received_confirmed_by_seller_at:
        transaction.itemReceivedConfirmedBySellerAt,
      cancellation_requested_by: transaction.cancellationRequestedBy,
      cancellation_reason: transaction.cancellationReason,
      cancellation_requested_at: transaction.cancellationRequestedAt,
      cancellation_response: transaction.cancellationResponse,
      refund_slip_url: transaction.refundSlipUrl,
      refund_submitted_at: transaction.refundSubmittedAt,
      refund_confirmed_by_buyer: transaction.refundConfirmedByBuyer,
      item_return_confirmed_at: transaction.itemReturnConfirmedAt,
      created_at: transaction.createdAt,
      additional_money: transaction.offer?.additionalMoney?.toNumber() ?? null,
      post: {
        post_id: transaction.post.postId,
        item_id: transaction.post.itemId,
        post_type: transaction.post.postType,
        price: transaction.post.price.toNumber(),
        quantity_remaining: transaction.post.quantityRemaining,
        created_at: transaction.post.createdAt,
        item: {
          item_id: item.itemId,
          owner_id: item.ownerId,
          name: item.name,
          quantity: 1,
          category: item.category,
          condition: item.condition,
          description: item.description,
          course_name: item.courseName,
          brand_model: item.brandModel,
          warranty_expiry: item.warrantyExpiry,
          size: item.size,
          created_at: item.createdAt,
          images: item.images.map((image) => ({
            image_id: image.imageId,
            item_id: image.itemId,
            image_url: image.imageUrl,
            is_primary: image.isPrimary ?? false,
            display_order: image.displayOrder ?? 0,
          })),
        },
        seller: this.serializeUserSummary(transaction.seller),
      },
      buyer: this.serializeUserSummary(transaction.buyer),
      seller: this.serializeUserSummary(transaction.seller),
    };
  }

  private readonly transactionInclude = {
    post: { include: { item: { include: { images: true } } } },
    offer: true,
    buyer: true,
    seller: true,
  } as const;

  async findAllForUser(userId: number) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: this.transactionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return transactions.map((transaction) =>
      this.serializeTransaction(transaction),
    );
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

  /** Public GET /transactions/{id} — the only caller of this one; every
   * mutating method below reads through `findOneOrThrow` instead, which
   * stays a raw, unincluded row since they only ever touch scalar columns. */
  async findOneForUser(transactionId: number, userId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
      include: this.transactionInclude,
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenException('You are not a party to this transaction');
    }
    return this.serializeTransaction(transaction);
  }

  /** §7.1/§7.5.3 — GET /admin/transactions/{id}. Same read as
   * `findOneForUser`, minus the participant check: an admin reviewing a
   * report is neither the buyer nor the seller. */
  async findOneForAdmin(transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
      include: this.transactionInclude,
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }
    return this.serializeTransaction(transaction);
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

  private async updateCurrent(
    transaction: TransactionRow,
    data: Prisma.TransactionUpdateManyMutationInput,
    guard: Prisma.TransactionWhereInput = {},
  ) {
    const changed = await this.prisma.transaction.updateMany({
      where: {
        ...guard,
        transactionId: transaction.transactionId,
        status: transaction.status,
        cancellationResponse: transaction.cancellationResponse,
        activeReportId: transaction.activeReportId,
        paymentConfirmedByBuyerAt: transaction.paymentConfirmedByBuyerAt,
        paymentConfirmedBySellerAt: transaction.paymentConfirmedBySellerAt,
        itemReceivedConfirmedByBuyerAt:
          transaction.itemReceivedConfirmedByBuyerAt,
        refundConfirmedByBuyer: transaction.refundConfirmedByBuyer,
      },
      data,
    });
    if (changed.count !== 1)
      throw new ConflictException(
        'The transaction changed; reload before trying again',
      );
    return this.findOneOrThrow(transaction.transactionId);
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
   * §8.7 — the confirm buttons stay locked while a cancellation is unsettled,
   * so nobody can race it by confirming anyway. There are exactly two unsettled
   * states, and both have to end for the transaction to move again:
   *
   *   response Pending                    waiting on the other party
   *   response Rejected + activeReportId  waiting on an admin
   *
   * Checking `cancellationRequestedBy !== null` instead would lock the
   * transaction forever, because that column is never cleared once set.
   */
  private assertNoPendingCancellation(transaction: TransactionRow) {
    if (transaction.cancellationResponse === CancellationResponse.Pending) {
      throw new BadRequestException(
        'A cancellation request is pending on this transaction — the other party must respond first',
      );
    }
    if (
      transaction.cancellationResponse === CancellationResponse.Rejected &&
      transaction.activeReportId !== null
    ) {
      throw new BadRequestException(
        'A rejected cancellation is under admin review — wait for the ruling',
      );
    }
  }

  private assertNoActiveReport(transaction: TransactionRow) {
    if (transaction.activeReportId !== null) {
      throw new BadRequestException(
        'This transaction is under admin review — wait for the ruling',
      );
    }
  }

  /**
   * The seller turned the buyer's slip down (`rejectPaymentSlip`) and nothing
   * has settled it yet. There is no column for this: a paid deal only reaches
   * Processing through a slip, so Processing with the buyer's claim still on
   * record but no slip on file can only mean the slip was rejected.
   */
  private slipRejected(transaction: TransactionRow) {
    return (
      transaction.status === TransactionStatus.Processing &&
      transaction.paymentConfirmedByBuyerAt !== null &&
      transaction.slipImageUrl === null
    );
  }

  /**
   * §8.6 step 1 — the buyer transfers money off-platform, uploads the slip and
   * confirms. That moves the transaction Pending → Processing. The platform
   * only records that the buyer says they paid; it never moves money itself.
   *
   * Also the buyer's way out of a rejected slip: a new one puts the deal back
   * in front of the seller. Closed once the seller has uploaded a refund slip
   * — from then on the buyer answers that instead.
   */
  async uploadPaymentSlip(
    transactionId: number,
    userId: number,
    dto: UploadPaymentSlipDto,
  ) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsBuyer(transaction, userId);
    const resubmitting = this.slipRejected(transaction);
    if (!resubmitting)
      this.assertStatus(transaction, TransactionStatus.Pending);
    this.assertNoPendingCancellation(transaction);
    if (!(await this.paymentRequired(transaction)))
      throw new BadRequestException('This trade does not require payment');
    if (resubmitting && transaction.refundSlipUrl) {
      throw new BadRequestException(
        'The seller has sent a refund slip — confirm the refund first',
      );
    }

    return this.updateCurrent(
      transaction,
      {
        slipImageUrl: dto.slip_image_url,
        paymentConfirmedByBuyerAt: new Date(),
        status: TransactionStatus.Processing,
      },
      resubmitting ? { slipImageUrl: null, refundSlipUrl: null } : {},
    );
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
    if (this.slipRejected(transaction)) {
      throw new BadRequestException(
        'The payment slip was rejected — wait for a new one',
      );
    }

    return this.updateCurrent(
      transaction,
      { paymentConfirmedBySellerAt: new Date() },
      { slipImageUrl: { not: null } },
    );
  }

  /**
   * §8.6 step 2, the other branch — the slip does not match what the seller's
   * bank shows. Only the slip is taken off file; the transaction deliberately
   * stays Processing, because the buyer may really have sent money. Dropping
   * straight back to Pending would let the seller cancel unilaterally
   * (`requestCancellation`) and walk away with it.
   *
   * From here (`slipRejected`) there are three ways on:
   *
   *   uploadPaymentSlip               the buyer sends a correct slip
   *   uploadRefundSlip + confirmRefund the seller returns what arrived and the
   *                                   buyer confirms it → back to Pending
   *   requestCancellation             still needs consent, and an approved one
   *                                   still goes through Pending Refund
   *
   * Not allowed once the seller has confirmed the money, once the goods have
   * been handed over, or while an admin is reviewing the transaction.
   */
  async rejectPaymentSlip(transactionId: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${transactionId} FOR UPDATE`;
      const transaction = await tx.transaction.findUnique({
        where: { transactionId },
      });
      if (!transaction) {
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }
      this.assertIsSeller(transaction, userId);
      this.assertStatus(transaction, TransactionStatus.Processing);
      this.assertNoPendingCancellation(transaction);

      if (!transaction.slipImageUrl || !transaction.paymentConfirmedByBuyerAt) {
        throw new BadRequestException('There is no payment slip to reject');
      }
      if (transaction.paymentConfirmedBySellerAt) {
        throw new BadRequestException(
          'Payment receipt has already been confirmed',
        );
      }
      if (transaction.itemReceivedConfirmedByBuyerAt) {
        throw new BadRequestException('Handover is already recorded');
      }
      this.assertNoActiveReport(transaction);

      const updated = await tx.transaction.update({
        where: { transactionId },
        data: { slipImageUrl: null },
      });
      // Keyed on the rejected slip's own timestamp (a new upload restamps it),
      // so each rejected upload gets its own notification without colliding
      // on the unique event_key.
      await tx.notification.create({
        data: {
          userId: transaction.buyerId,
          eventKey: `transaction:${transactionId}:payment-slip-rejected:${transaction.paymentConfirmedByBuyerAt.getTime()}`,
          title: 'Payment slip rejected',
          body: `The seller could not match your slip for transaction #${transactionId}. Upload a new one, or wait for the seller to return what you sent.`,
          href: `/history/${transactionId}`,
        },
      });
      return updated;
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

    return this.updateCurrent(transaction, {
      trackingNumber: dto.tracking_number,
      estimatedDeliveryDate: new Date(dto.estimated_delivery_date),
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
      await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${transactionId} FOR UPDATE`;
      const current = await tx.transaction.findUniqueOrThrow({
        where: { transactionId },
      });
      this.assertNoPendingCancellation(current);
      const needsPayment = await this.paymentRequired(current);
      this.assertStatus(
        current,
        needsPayment ? TransactionStatus.Processing : TransactionStatus.Pending,
      );
      if (current.itemReceivedConfirmedByBuyerAt)
        throw new BadRequestException('Handover is already recorded');
      const updated = await tx.transaction.update({
        where: { transactionId },
        data: { itemReceivedConfirmedByBuyerAt: new Date() },
      });

      if (
        !updated.paymentConfirmedBySellerAt &&
        (await this.paymentRequired(updated))
      ) {
        return updated;
      }

      const completed = await tx.transaction.update({
        where: { transactionId },
        data: { status: TransactionStatus.Completed },
      });

      // §8.2 — an offered item is always single-channel by construction (it
      // must be fully available before it can be offered — see createOffer's
      // available === quantity check), so marking it Transferred here still
      // holds even though the listing's own item (above) can now have other
      // open channels. Unlike the listing's item, this one keeps its
      // item_status write until the column itself is dropped in round 2.
      if (completed.offerId !== null) {
        await tx.item.updateMany({
          where: { offerItems: { some: { offerId: completed.offerId } } },
          data: { status: 'Transferred' },
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
    if (transaction.status === TransactionStatus.PendingRefund)
      return this.generateReturnQr(transaction, userId);
    this.assertIsSeller(transaction, userId);
    this.assertDeliveryMethod(transaction, DeliveryMethod.Meetup);
    await this.assertHandoverReady(transaction);

    if (transaction.itemReceivedConfirmedByBuyerAt) {
      throw new BadRequestException('This item has already been handed over');
    }

    const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const key = qrTokenKey(transactionId);
    const link = (t: string) =>
      // What the QR image should encode: a plain link the buyer's camera app
      // can open, which then asks them to confirm once more before anything
      // changes (§8.6 "สแกนแล้วต้องกดยืนยันซ้ำ").
      `${baseUrl}/history/${transactionId}/scan?token=${t}`;

    // One code per 15 minutes: if a token is still alive, hand back the same one
    // with the time it has left, so reopening the QR keeps counting down the
    // original instead of minting a new code every time.
    const existing = await this.redis.get(key);
    if (existing) {
      const ttlMs = await this.redis.pttl(key);
      if (ttlMs > 0) {
        return {
          token: existing,
          url: link(existing),
          expiresInSeconds: Math.ceil(ttlMs / 1000),
        };
      }
    }

    const token = randomBytes(32).toString('hex');
    await this.redis.set(key, token, 'EX', QR_TOKEN_TTL_SECONDS);
    return {
      token,
      url: link(token),
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
    if (transaction.status === TransactionStatus.PendingRefund)
      return this.scanReturnQr(transaction, userId, dto.token);
    this.assertIsBuyer(transaction, userId);
    this.assertDeliveryMethod(transaction, DeliveryMethod.Meetup);
    await this.assertHandoverReady(transaction);

    if (transaction.itemReceivedConfirmedByBuyerAt) {
      throw new BadRequestException('This item has already been handed over');
    }

    const key = qrTokenKey(transactionId);
    const consumed = await this.redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      key,
      dto.token,
    );
    if (consumed !== 1)
      throw new BadRequestException('Invalid or expired handover QR');
    return this.confirmItemReceived(transactionId);
  }

  /** Money transfers happen off-platform; recorded evidence drives the refund states. */
  private assertRefundable(transaction: TransactionRow) {
    if (
      ![TransactionStatus.PendingRefund, TransactionStatus.Cancelled].includes(
        transaction.status as 'Pending Refund' | 'Cancelled',
      )
    ) {
      throw new BadRequestException(
        'This transaction is not awaiting a refund',
      );
    }
    if (!transaction.paymentConfirmedByBuyerAt) {
      throw new BadRequestException('No payment was made on this transaction');
    }
  }

  private async paymentRequired(transaction: TransactionRow) {
    if (transaction.offerId === null) return true;
    const offer = await this.prisma.offer.findUnique({
      where: { offerId: transaction.offerId },
    });
    return Number(offer?.additionalMoney ?? 0) > 0;
  }

  private async assertHandoverReady(transaction: TransactionRow) {
    const paid = await this.paymentRequired(transaction);
    this.assertStatus(
      transaction,
      paid ? TransactionStatus.Processing : TransactionStatus.Pending,
    );
    this.assertNoPendingCancellation(transaction);
    if (paid && !transaction.paymentConfirmedBySellerAt) {
      throw new BadRequestException(
        'Confirm payment before handing over the item',
      );
    }
    // §appointment loop fix — the current appointment is the newest card that
    // has NOT been retired (deleted_at null). Rejecting a proposed change now
    // retires that card, so a stale Confirmed one can never satisfy this check.
    const appointment = await this.prisma.appointmentCard.findFirst({
      where: { transactionId: transaction.transactionId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { appointmentId: 'desc' }],
    });
    if (!appointment || appointment.status !== 'Confirmed')
      throw new BadRequestException(
        'Confirm the latest meetup appointment before handover',
      );
  }

  private refundFinished(transaction: TransactionRow) {
    const moneyReturned =
      !transaction.paymentConfirmedByBuyerAt ||
      transaction.refundConfirmedByBuyer;
    const goodsReturned =
      !transaction.itemReceivedConfirmedByBuyerAt ||
      transaction.itemReturnConfirmedAt;
    return Boolean(moneyReturned && goodsReturned);
  }

  /** Seller submits refund evidence, starting the confirmation deadline. */
  async uploadRefundSlip(
    transactionId: number,
    userId: number,
    dto: UploadRefundSlipDto,
  ) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsSeller(transaction, userId);
    if (this.slipRejected(transaction)) {
      // Returning the money behind a rejected slip is not a cancellation, so
      // the deal stays Processing until the buyer confirms it arrived.
      this.assertNoPendingCancellation(transaction);
      this.assertNoActiveReport(transaction);
      return this.updateCurrent(
        transaction,
        {
          refundSlipUrl: dto.refund_slip_url,
          refundSubmittedAt: transaction.refundSubmittedAt ?? new Date(),
        },
        { slipImageUrl: null },
      );
    }
    this.assertRefundable(transaction);

    return this.updateCurrent(transaction, {
      refundSlipUrl: dto.refund_slip_url,
      refundSubmittedAt: transaction.refundSubmittedAt ?? new Date(),
      status: TransactionStatus.PendingRefund,
    });
  }

  /** Buyer acknowledges receipt; completed returns also require the goods. */
  async confirmRefund(transactionId: number, userId: number) {
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsBuyer(transaction, userId);
    if (this.slipRejected(transaction)) {
      this.assertNoPendingCancellation(transaction);
      this.assertNoActiveReport(transaction);
      if (!transaction.refundSlipUrl) {
        throw new BadRequestException(
          'The seller has not uploaded a refund slip yet',
        );
      }
      // The money is back with the buyer, so nothing is owed either way: the
      // payment claim and the refund evidence are wiped and the deal returns
      // to Pending, where the buyer can pay again or either side can cancel.
      return this.updateCurrent(
        transaction,
        {
          status: TransactionStatus.Pending,
          paymentConfirmedByBuyerAt: null,
          refundSlipUrl: null,
          refundSubmittedAt: null,
        },
        { slipImageUrl: null, refundSlipUrl: { not: null } },
      );
    }
    this.assertRefundable(transaction);

    if (!transaction.refundSlipUrl) {
      throw new BadRequestException(
        'The seller has not uploaded a refund slip yet',
      );
    }
    if (transaction.refundConfirmedByBuyer) {
      throw new BadRequestException('This refund has already been confirmed');
    }

    return this.recordReturnProgress(transactionId, {
      refundConfirmedByBuyer: true,
    });
  }

  private async recordReturnProgress(
    transactionId: number,
    progress: {
      refundConfirmedByBuyer?: boolean;
      itemReturnConfirmedAt?: Date;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${transactionId} FOR UPDATE`;
      const current = await tx.transaction.findUniqueOrThrow({
        where: { transactionId },
      });
      if (!['Pending Refund', 'Cancelled'].includes(current.status ?? ''))
        throw new BadRequestException('Return already completed');
      if (
        (progress.refundConfirmedByBuyer && current.refundConfirmedByBuyer) ||
        (progress.itemReturnConfirmedAt && current.itemReturnConfirmedAt)
      ) {
        throw new BadRequestException('This return step is already recorded');
      }
      const updated = { ...current, ...progress };
      return tx.transaction.update({
        where: { transactionId },
        data: {
          ...progress,
          status: this.refundFinished(updated)
            ? TransactionStatus.Refunded
            : TransactionStatus.PendingRefund,
        },
      });
    });
  }

  private async generateReturnQr(transaction: TransactionRow, userId: number) {
    this.assertIsParty(transaction, userId);
    if (transaction.cancellationRequestedBy === userId)
      throw new ForbiddenException('The other party shows the return QR');
    if (
      !transaction.itemReceivedConfirmedByBuyerAt ||
      transaction.itemReturnConfirmedAt
    )
      throw new BadRequestException('No item return is outstanding');
    if (transaction.offerId === null) {
      const appointment = await this.prisma.appointmentCard.findFirst({
        where: {
          transactionId: transaction.transactionId,
          deletedAt: null,
          createdAt: { gte: transaction.cancellationRequestedAt ?? new Date() },
        },
        orderBy: [{ createdAt: 'desc' }, { appointmentId: 'desc' }],
      });
      if (!appointment || appointment.status !== 'Confirmed')
        throw new BadRequestException(
          'Confirm a new return appointment before handover',
        );
    }
    // One code per 15 minutes here too — reopening the return QR keeps the same
    // countdown instead of minting a fresh code every time.
    const key = `return_qr:${transaction.transactionId}`;
    const existing = await this.redis.get(key);
    if (existing) {
      const ttlMs = await this.redis.pttl(key);
      if (ttlMs > 0) {
        return { token: existing, expiresInSeconds: Math.ceil(ttlMs / 1000) };
      }
    }
    const token = randomBytes(32).toString('hex');
    await this.redis.set(key, token, 'EX', QR_TOKEN_TTL_SECONDS);
    return { token, expiresInSeconds: QR_TOKEN_TTL_SECONDS };
  }

  private async scanReturnQr(
    transaction: TransactionRow,
    userId: number,
    token: string,
  ) {
    this.assertIsParty(transaction, userId);
    if (transaction.cancellationRequestedBy !== userId)
      throw new ForbiddenException('The return requester scans the QR');
    if (
      !transaction.itemReceivedConfirmedByBuyerAt ||
      transaction.itemReturnConfirmedAt
    )
      throw new BadRequestException('No item return is outstanding');
    const key = `return_qr:${transaction.transactionId}`;
    const consumed = await this.redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      key,
      token,
    );
    if (consumed !== 1)
      throw new BadRequestException('Invalid or expired return QR');
    const itemReturnConfirmedAt = new Date();
    return this.recordReturnProgress(transaction.transactionId, {
      itemReturnConfirmedAt,
    });
  }

  private assertIsParty(transaction: TransactionRow, userId: number) {
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenException('You are not a party to this transaction');
    }
  }

  /**
   * §8.3 — cancelling puts everything the transaction was holding back on the
   * market:
   *
   *  - the reserved stock. Buying decrements Post.quantityRemaining
   *    (posts.service.ts `buy`), so cancelling has to add the same amount back
   *    or the stock is lost for good.
   *
   * Does not touch the item at all: `available` is derived on demand from
   * every channel's quantity_total/quantity_remaining, so releasing this
   * post's reservation is already reflected the moment quantityRemaining
   * goes back up. There is no per-item status left to rewind.
   *
   * `quantity` is nullable in the schema, so callers pass `?? 1` to match the
   * column default.
   */
  private async releaseReservation(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    postId: number,
    quantity: number,
  ) {
    await tx.post.update({
      where: { postId },
      data: { quantityRemaining: { increment: quantity } },
    });
  }

  /**
   * §8.3 / §8.7 — asking to cancel behaves completely differently per status:
   *
   *   Pending    no money has actually moved yet, so either side may cancel
   *              unilaterally and it takes effect immediately.
   *   Processing the buyer has already paid, so cancelling REQUIRES the other
   *              side's consent. All this does is record the request, which
   *              also locks both confirm buttons until it is answered.
   *
   * Only one request per transaction: a rejected one keeps its record so the
   * buttons stay locked pending an admin ruling, and an approved one has
   * already ended the transaction.
   */
  async requestCancellation(
    transactionId: number,
    userId: number,
    dto: RequestCancellationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${transactionId} FOR UPDATE`;
      const transaction = await tx.transaction.findUnique({
        where: { transactionId },
      });
      if (!transaction) throw new NotFoundException('Transaction not found');
      this.assertIsParty(transaction, userId);
      if (transaction.cancellationRequestedBy !== null)
        throw new BadRequestException('A request already exists');
      if (transaction.status === TransactionStatus.Completed) {
        const completedAt = transaction.itemReceivedConfirmedByBuyerAt;
        if (
          !completedAt ||
          Date.now() - completedAt.getTime() > 7 * 24 * 60 * 60 * 1000
        ) {
          throw new BadRequestException(
            'Returns must be requested within seven days of completion',
          );
        }
      } else if (
        transaction.status !== TransactionStatus.Pending &&
        transaction.status !== TransactionStatus.Processing
      ) {
        throw new BadRequestException(
          'This transaction cannot be cancelled or returned',
        );
      }
      const immediate = transaction.status === TransactionStatus.Pending;
      const updated = await tx.transaction.update({
        where: { transactionId },
        data: {
          cancellationRequestedBy: userId,
          cancellationReason: dto.reason,
          cancellationRequestedAt: new Date(),
          cancellationResponse: immediate
            ? CancellationResponse.Approved
            : CancellationResponse.Pending,
          ...(immediate ? { status: TransactionStatus.Cancelled } : {}),
        },
      });
      if (immediate)
        await this.releaseReservation(
          tx,
          transaction.postId,
          transaction.quantity ?? 1,
        );
      return updated;
    });
  }

  /**
   * §8.7 — the other party answers.
   *
   *   Approved  → Cancelled, and the item goes back on the market.
   *   Rejected  → NOT cancelled and NOT auto-resolved. The dispute goes to an
   *               admin: a Transaction report is opened and linked via
   *               activeReportId, and the confirm buttons stay locked (the
   *               cancellation record is kept, which is what keeps them locked).
   *
   * The requester never answers their own request — that is the whole point of
   * requiring consent.
   */
  async respondToCancellation(
    transactionId: number,
    userId: number,
    dto: RespondCancellationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${transactionId} FOR UPDATE`;
      const transaction = await tx.transaction.findUnique({
        where: { transactionId },
      });
      if (!transaction) throw new NotFoundException('Transaction not found');
      this.assertIsParty(transaction, userId);
      if (
        transaction.cancellationRequestedBy === null ||
        transaction.cancellationResponse !== CancellationResponse.Pending
      ) {
        throw new BadRequestException('There is no pending request');
      }
      if (transaction.cancellationRequestedBy === userId)
        throw new ForbiddenException('The other party must respond');
      if (dto.response === CancellationResponse.Approved) {
        const updated = await tx.transaction.update({
          where: { transactionId },
          data: {
            status:
              transaction.paymentConfirmedByBuyerAt ||
              transaction.itemReceivedConfirmedByBuyerAt
                ? TransactionStatus.PendingRefund
                : TransactionStatus.Cancelled,
            cancellationResponse: CancellationResponse.Approved,
          },
        });
        if (!transaction.itemReceivedConfirmedByBuyerAt)
          await this.releaseReservation(
            tx,
            transaction.postId,
            transaction.quantity ?? 1,
          );
        return updated;
      }
      const report = await tx.report.create({
        data: {
          reporterId: transaction.cancellationRequestedBy,
          reportType: ReportType.Transaction,
          targetId: transactionId,
          reasonCategory: 'Cancellation or return rejected',
          details: transaction.cancellationReason,
          status: ReportStatus.Pending,
        },
      });
      await notifyAdminsOfReport(tx, report);
      return tx.transaction.update({
        where: { transactionId },
        data: {
          cancellationResponse: CancellationResponse.Rejected,
          activeReportId: report.reportId,
        },
      });
    });
  }

  /**
   * §8.7 — turns an admin's ruling on a rejected cancellation into an actual
   * transaction state change. Called by ReportService when a report is closed,
   * because resolving the report is the admin action the spec describes
   * ("ปุ่มยืนยันยังล็อกอยู่จนแอดมินตัดสิน").
   *
   * Without this the transaction is bricked: the confirm endpoints stay locked
   * on the open dispute, requestCancellation refuses (one request per
   * transaction) and respondToCancellation refuses (no longer Pending).
   *
   * Two outcomes, mirroring the two ways a report can close:
   *
   *   upheld    the requester was right, so the cancellation takes effect —
   *             Cancelled, and the stock and item go back on the market.
   *   dismissed the requester was wrong, so the transaction carries on. The
   *             dispute link is cleared, which is what unlocks the confirm
   *             buttons; the Rejected record itself is kept as history.
   *
   * No-op for reports that are not a cancellation dispute.
   */
  async settleCancellationDispute(reportId: number, upheld: boolean) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        activeReportId: reportId,
        cancellationResponse: CancellationResponse.Rejected,
      },
    });
    if (!transaction) {
      return;
    }

    if (!upheld) {
      await this.prisma.transaction.update({
        where: { transactionId: transaction.transactionId },
        data: { activeReportId: null },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.transaction.update({
        where: { transactionId: transaction.transactionId },
        data: {
          status:
            transaction.paymentConfirmedByBuyerAt ||
            transaction.itemReceivedConfirmedByBuyerAt
              ? TransactionStatus.PendingRefund
              : TransactionStatus.Cancelled,
          cancellationResponse: CancellationResponse.Approved,
        },
      });
      if (!transaction.itemReceivedConfirmedByBuyerAt)
        await this.releaseReservation(
          tx,
          cancelled.postId,
          cancelled.quantity ?? 1,
        );
    });
  }
}
