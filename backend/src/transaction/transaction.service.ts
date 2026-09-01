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
  CancellationResponse,
  DeliveryMethod,
  ItemStatus,
  TransactionStatus,
} from '../common/enums/transaction.enums';
import { ReportStatus, ReportType } from '../common/enums/report.enums';
import { UploadPaymentSlipDto } from './dto/upload-payment-slip.dto';
import { ShipTransactionDto } from './dto/ship-transaction.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { UploadRefundSlipDto } from './dto/upload-refund-slip.dto';
import { RequestCancellationDto } from './dto/request-cancellation.dto';
import { RespondCancellationDto } from './dto/respond-cancellation.dto';

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
  }) {
    return {
      user_id: user.userId,
      name: `${user.firstNameEn} ${user.lastNameEn}`.trim(),
      isVerified: user.emailVerifiedAt !== null,
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
    refundConfirmedByBuyer: boolean | null;
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
        status: string | null;
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
      item_received_confirmed_by_buyer_at: transaction.itemReceivedConfirmedByBuyerAt,
      item_received_confirmed_by_seller_at: transaction.itemReceivedConfirmedBySellerAt,
      cancellation_requested_by: transaction.cancellationRequestedBy,
      cancellation_reason: transaction.cancellationReason,
      cancellation_requested_at: transaction.cancellationRequestedAt,
      cancellation_response: transaction.cancellationResponse,
      refund_slip_url: transaction.refundSlipUrl,
      refund_confirmed_by_buyer: transaction.refundConfirmedByBuyer,
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
          status: item.status,
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
    return transactions.map((transaction) => this.serializeTransaction(transaction));
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
   *  - the item's Listed status, EXCEPT once it is Transferred — that is
   *    terminal and never rewinds, even if the transaction is cancelled
   *    afterwards (§8.2).
   *
   * `quantity` is nullable in the schema, so callers pass `?? 1` to match the
   * column default.
   */
  private async releaseReservation(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    postId: number,
    quantity: number,
  ) {
    const post = await tx.post.findUnique({
      where: { postId },
      select: { itemId: true, item: { select: { status: true } } },
    });
    if (!post) {
      return;
    }

    await tx.post.update({
      where: { postId },
      data: { quantityRemaining: { increment: quantity } },
    });

    if (post.item.status === ItemStatus.Transferred) {
      return;
    }
    await tx.item.update({
      where: { itemId: post.itemId },
      data: { status: ItemStatus.Listed },
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
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsParty(transaction, userId);

    if (transaction.cancellationRequestedBy !== null) {
      throw new BadRequestException(
        'A cancellation has already been requested on this transaction',
      );
    }

    if (transaction.status === TransactionStatus.Pending) {
      return this.prisma.$transaction(async (tx) => {
        const cancelled = await tx.transaction.update({
          where: { transactionId },
          data: {
            status: TransactionStatus.Cancelled,
            cancellationRequestedBy: userId,
            cancellationReason: dto.reason,
            cancellationRequestedAt: new Date(),
            // No counterparty consent is needed at this stage, so the request
            // is settled the moment it is made.
            cancellationResponse: CancellationResponse.Approved,
          },
        });
        await this.releaseReservation(
          tx,
          cancelled.postId,
          cancelled.quantity ?? 1,
        );
        return cancelled;
      });
    }

    if (transaction.status === TransactionStatus.Processing) {
      return this.prisma.transaction.update({
        where: { transactionId },
        data: {
          cancellationRequestedBy: userId,
          cancellationReason: dto.reason,
          cancellationRequestedAt: new Date(),
          cancellationResponse: CancellationResponse.Pending,
        },
      });
    }

    throw new BadRequestException(
      `Only Pending or Processing transactions can be cancelled (current: ${transaction.status})`,
    );
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
    const transaction = await this.findOneOrThrow(transactionId);
    this.assertIsParty(transaction, userId);

    if (
      transaction.cancellationRequestedBy === null ||
      transaction.cancellationResponse !== CancellationResponse.Pending
    ) {
      throw new BadRequestException(
        'There is no pending cancellation request on this transaction',
      );
    }
    if (transaction.cancellationRequestedBy === userId) {
      throw new ForbiddenException(
        'The other party must respond to your cancellation request',
      );
    }

    if (dto.response === CancellationResponse.Approved) {
      return this.prisma.$transaction(async (tx) => {
        const cancelled = await tx.transaction.update({
          where: { transactionId },
          data: {
            status: TransactionStatus.Cancelled,
            cancellationResponse: CancellationResponse.Approved,
          },
        });
        await this.releaseReservation(
          tx,
          cancelled.postId,
          cancelled.quantity ?? 1,
        );
        return cancelled;
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          reporterId: transaction.cancellationRequestedBy as number,
          reportType: ReportType.Transaction,
          targetId: transactionId,
          reasonCategory: 'Cancellation rejected',
          details: transaction.cancellationReason,
          status: ReportStatus.Under_Investigation,
        },
      });

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
          status: TransactionStatus.Cancelled,
          cancellationResponse: CancellationResponse.Approved,
        },
      });
      await this.releaseReservation(
        tx,
        cancelled.postId,
        cancelled.quantity ?? 1,
      );
    });
  }
}
