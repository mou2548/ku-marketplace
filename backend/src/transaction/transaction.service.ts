import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  CancellationResponse,
  DeliveryMethod,
  TransactionStatus,
} from '../common/enums/transaction.enums';
import { ReportStatus, ReportType } from '../common/enums/report.enums';
import { UploadPaymentSlipDto } from './dto/upload-payment-slip.dto';
import { RejectPaymentSlipDto } from './dto/reject-payment-slip.dto';
import { ShipTransactionDto } from './dto/ship-transaction.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { UploadRefundSlipDto } from './dto/upload-refund-slip.dto';
import { RequestCancellationDto } from './dto/request-cancellation.dto';
import { RespondCancellationDto } from './dto/respond-cancellation.dto';
import { notifyAdminsOfReport } from '../report/moderation-notifications';
import { displayName } from '../common/utils/display-name';
import { maskPromptPayId, promptPayPayload } from '../common/utils/promptpay';
import {
  CANCELLATION_REJECTED_REASON,
  PaymentStatus,
  findLockingReports,
  isLockingReason,
  loadTransactionSnapshot,
  toTransactionSnapshot,
  toTransactionState,
  transactionStateInclude,
  type TransactionSnapshot,
  type TransactionState,
} from './transaction-state';

type TransactionRow = TransactionSnapshot;
type Db = Prisma.TransactionClient;

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
    firstNameTh?: string | null;
    lastNameTh?: string | null;
    emailVerifiedAt: Date | null;
    avatarUrl?: string | null;
  }) {
    return {
      user_id: user.userId,
      name: displayName(user),
      isVerified: user.emailVerifiedAt !== null,
      avatar_url: user.avatarUrl ?? null,
    };
  }

  /**
   * `state` carries every per-deal field (see `transaction-state.ts`); the row
   * itself is only read for the relations around it. `final_amount` is the
   * stored `total_amount`: what the buyer owed when the deal was made, so a
   * later price edit on the post does not move it.
   */
  private serializeTransaction(
    transaction: {
      post: {
        postId: number;
        itemId: number;
        postType: string;
        price: { toNumber(): number } | null;
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
    },
    state: TransactionState,
  ) {
    const item = transaction.post.item;
    return {
      transaction_id: state.transactionId,
      post_id: state.postId,
      offer_id: state.offerId,
      buyer_id: state.buyerId,
      seller_id: state.sellerId,
      quantity: state.quantity,
      final_amount: state.totalAmount,
      status: state.status,
      delivery_method: state.deliveryMethod,
      active_report_id: state.activeReportId,
      slip_image_url: state.slipImageUrl,
      tracking_number: state.trackingNumber,
      estimated_delivery_date: state.estimatedDeliveryDate,
      payment_confirmed_by_buyer_at: state.paymentConfirmedByBuyerAt,
      payment_confirmed_by_seller_at: state.paymentConfirmedBySellerAt,
      payment_rejection_reason: state.paymentRejectionReason,
      item_received_confirmed_by_buyer_at: state.itemReceivedConfirmedByBuyerAt,
      item_received_confirmed_by_seller_at:
        state.itemReceivedConfirmedBySellerAt,
      cancellation_requested_by: state.cancellationRequestedBy,
      cancellation_reason: state.cancellationReason,
      cancellation_requested_at: state.cancellationRequestedAt,
      cancellation_response: state.cancellationResponse,
      refund_slip_url: state.refundSlipUrl,
      refund_submitted_at: state.refundSubmittedAt,
      refund_confirmed_by_buyer: state.refundConfirmedByBuyer,
      item_return_confirmed_at: state.itemReturnConfirmedAt,
      created_at: state.createdAt,
      additional_money: transaction.offer?.additionalMoney?.toNumber() ?? null,
      post: {
        post_id: transaction.post.postId,
        item_id: transaction.post.itemId,
        post_type: transaction.post.postType,
        price: transaction.post.price?.toNumber() ?? 0,
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
    ...transactionStateInclude,
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
    const locks = await findLockingReports(
      this.prisma,
      transactions.map((transaction) => transaction.transactionId),
    );
    return transactions.map((transaction) =>
      this.serializeTransaction(
        transaction,
        toTransactionSnapshot(
          transaction,
          locks.get(transaction.transactionId) ?? null,
        ),
      ),
    );
  }

  private async findSerialized(transactionId: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { transactionId },
      include: this.transactionInclude,
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }
    const locks = await findLockingReports(this.prisma, [transactionId]);
    return {
      transaction,
      state: toTransactionSnapshot(
        transaction,
        locks.get(transactionId) ?? null,
      ),
    };
  }

  /** Public GET /transactions/{id}. */
  async findOneForUser(transactionId: number, userId: number) {
    const { transaction, state } = await this.findSerialized(transactionId);
    if (state.buyerId !== userId && state.sellerId !== userId) {
      throw new ForbiddenException('You are not a party to this transaction');
    }
    return this.serializeTransaction(transaction, state);
  }

  /** §7.1/§7.5.3 — GET /admin/transactions/{id}. Same read as
   * `findOneForUser`, minus the participant check: an admin reviewing a
   * report is neither the buyer nor the seller. */
  async findOneForAdmin(transactionId: number) {
    const { transaction, state } = await this.findSerialized(transactionId);
    return this.serializeTransaction(transaction, state);
  }

  private async loadOrThrow(db: Db | PrismaService, transactionId: number) {
    const transaction = await loadTransactionSnapshot(db, transactionId);
    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }
    return transaction;
  }

  /**
   * Every state change runs here: the transaction row is locked first, so two
   * requests on the same deal are serialised, and `work` validates against the
   * state it will actually write over. Returns the deal as it stands after.
   */
  private async mutate(
    transactionId: number,
    work: (tx: Db, current: TransactionRow) => Promise<void>,
  ): Promise<TransactionState> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "transaction_id" FROM "Transaction" WHERE "transaction_id" = ${transactionId} FOR UPDATE`;
      await work(tx, await this.loadOrThrow(tx, transactionId));
      return toTransactionState(await this.loadOrThrow(tx, transactionId));
    });
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
   * §8.7 — the confirm buttons stay locked while the deal is unsettled, so
   * nobody can race it by confirming anyway. Two states lock it, and both have
   * to end for the transaction to move again:
   *
   *   cancellation response Pending   waiting on the other party
   *   an open system report           waiting on an admin: a rejected
   *                                   cancellation, or a step that timed out
   *                                   and went to the report flow
   *
   * Checking `cancellationRequestedBy !== null` instead would lock the
   * transaction forever, because a request's record is kept once answered.
   */
  private assertNoPendingCancellation(transaction: TransactionRow) {
    if (transaction.cancellationResponse === CancellationResponse.Pending) {
      throw new BadRequestException(
        'A cancellation request is pending on this transaction — the other party must respond first',
      );
    }
    this.assertNoActiveReport(transaction);
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
   * has settled it yet: a paid deal only reaches Processing through a slip, so
   * Processing with the buyer's claim standing but no open slip means the
   * latest one was rejected.
   */
  private slipRejected(transaction: TransactionRow) {
    return (
      transaction.status === TransactionStatus.Processing &&
      transaction.paymentConfirmedByBuyerAt !== null &&
      transaction.slipImageUrl === null
    );
  }

  /**
   * The deal is waiting on the buyer's money: not yet paid, or the last slip
   * was rejected. Returns whether this is the second case.
   */
  private assertAwaitingPayment(transaction: TransactionRow) {
    const resubmitting = this.slipRejected(transaction);
    if (!resubmitting)
      this.assertStatus(transaction, TransactionStatus.Pending);
    this.assertNoPendingCancellation(transaction);
    if (!transaction.paymentRequired)
      throw new BadRequestException('This trade does not require payment');
    if (resubmitting && transaction.refundSlipUrl) {
      throw new BadRequestException(
        'The seller has sent a refund slip — confirm the refund first',
      );
    }
    if (transaction.paymentId !== null) {
      throw new BadRequestException('A payment slip is already on file');
    }
    return resubmitting;
  }

  /**
   * §8.6 step 1, before the slip — what the buyer scans to pay. A PromptPay QR
   * for the seller's registered number and exactly `total_amount`, so the
   * transfer cannot go to the wrong account or for the wrong sum. Built here
   * rather than in the browser, where either could be edited.
   *
   * It only fills in the bank app's transfer screen: nothing tells the
   * platform the money moved, so the slip upload and the seller's check still
   * follow. Available whenever a slip may be uploaded.
   */
  async paymentQr(transactionId: number, userId: number) {
    const transaction = await this.loadOrThrow(this.prisma, transactionId);
    this.assertIsBuyer(transaction, userId);
    this.assertAwaitingPayment(transaction);
    if (transaction.totalAmount <= 0) {
      throw new BadRequestException('This transaction has nothing to pay');
    }
    const seller = await this.prisma.user.findUnique({
      where: { userId: transaction.sellerId },
      select: { promptpayId: true },
    });
    if (!seller?.promptpayId) {
      throw new ConflictException('The seller has not set up PromptPay yet');
    }
    return {
      payload: promptPayPayload(seller.promptpayId, transaction.totalAmount),
      amount: transaction.totalAmount,
      // Enough to recognise the account; the full number is not repeated.
      promptpay_id: maskPromptPayId(seller.promptpayId),
    };
  }

  /**
   * §8.6 step 1 — the buyer transfers money off-platform, uploads the slip and
   * confirms. That moves the transaction Pending → Processing. The platform
   * only records that the buyer says they paid; it never moves money itself.
   *
   * Also the buyer's way out of a rejected slip: a new one puts the deal back
   * in front of the seller. Closed once the seller has uploaded a refund slip
   * — from then on the buyer answers that instead.
   *
   * Each upload is its own Transaction_Payment row, so a rejected slip stays
   * on record beside the one that replaced it.
   */
  async uploadPaymentSlip(
    transactionId: number,
    userId: number,
    dto: UploadPaymentSlipDto,
  ) {
    return this.mutate(transactionId, async (tx, transaction) => {
      this.assertIsBuyer(transaction, userId);
      const resubmitting = this.assertAwaitingPayment(transaction);

      await tx.transactionPayment.create({
        data: { transactionId, slipImageUrl: dto.slip_image_url },
      });
      if (!resubmitting) {
        await tx.transaction.update({
          where: { transactionId },
          data: { status: TransactionStatus.Processing },
        });
      }
    });
  }

  /**
   * §8.6 step 2 — the seller checks the slip against their bank and confirms
   * receipt. This is only the FIRST of the two conditions for Completed; the
   * item still has to be confirmed as received (delivery/QR flow), so the
   * status stays Processing here.
   */
  async confirmPaymentReceived(transactionId: number, userId: number) {
    return this.mutate(transactionId, async (tx, transaction) => {
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
      if (transaction.paymentId === null) {
        throw new BadRequestException('There is no payment slip to confirm');
      }

      await tx.transactionPayment.update({
        where: { paymentId: transaction.paymentId },
        data: {
          status: PaymentStatus.Confirmed,
          handledBy: userId,
          handledAt: new Date(),
        },
      });
    });
  }

  /**
   * §8.6 step 2, the other branch — the slip does not match what the seller's
   * bank shows. Only the slip is marked Rejected; the transaction deliberately
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
  async rejectPaymentSlip(
    transactionId: number,
    userId: number,
    dto: RejectPaymentSlipDto,
  ) {
    return this.mutate(transactionId, async (tx, transaction) => {
      this.assertIsSeller(transaction, userId);
      this.assertStatus(transaction, TransactionStatus.Processing);
      this.assertNoPendingCancellation(transaction);

      if (transaction.paymentConfirmedBySellerAt) {
        throw new BadRequestException(
          'Payment receipt has already been confirmed',
        );
      }
      if (transaction.paymentId === null) {
        throw new BadRequestException('There is no payment slip to reject');
      }
      if (transaction.itemReceivedConfirmedByBuyerAt) {
        throw new BadRequestException('Handover is already recorded');
      }

      await tx.transactionPayment.update({
        where: { paymentId: transaction.paymentId },
        data: {
          status: PaymentStatus.Rejected,
          rejectionReason: dto.reason,
          handledBy: userId,
          handledAt: new Date(),
        },
      });
      // Keyed on the rejected slip itself, so each rejected upload gets its
      // own notification.
      await tx.notification.create({
        data: {
          userId: transaction.buyerId,
          eventKey: `transaction:${transactionId}:payment-slip-rejected:${transaction.paymentId}`,
          title: 'Payment slip rejected',
          body: `The seller could not match your slip for transaction #${transactionId}: ${dto.reason}. Upload a new one, or wait for the seller to return what you sent.`,
          href: `/history/${transactionId}`,
        },
      });
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
    return this.mutate(transactionId, async (tx, transaction) => {
      this.assertIsSeller(transaction, userId);
      this.assertDeliveryMethod(transaction, DeliveryMethod.Shipping);
      this.assertStatus(transaction, TransactionStatus.Processing);
      this.assertNoPendingCancellation(transaction);

      if (!transaction.paymentConfirmedBySellerAt) {
        throw new BadRequestException(
          'Confirm the payment was received before shipping',
        );
      }

      const shipment = {
        trackingNumber: dto.tracking_number,
        estimatedDeliveryDate: new Date(dto.estimated_delivery_date),
      };
      await tx.transactionShipment.upsert({
        where: { transactionId },
        create: { transactionId, ...shipment, shippedAt: new Date() },
        update: shipment,
      });
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
    return this.mutate(transactionId, async (tx, current) => {
      this.assertNoPendingCancellation(current);
      this.assertStatus(
        current,
        current.paymentRequired
          ? TransactionStatus.Processing
          : TransactionStatus.Pending,
      );
      if (current.itemReceivedConfirmedByBuyerAt)
        throw new BadRequestException('Handover is already recorded');

      const completes =
        !current.paymentRequired || current.paymentConfirmedBySellerAt !== null;
      await tx.transaction.update({
        where: { transactionId },
        data: {
          itemReceivedConfirmedByBuyerAt: new Date(),
          ...(completes ? { status: TransactionStatus.Completed } : {}),
        },
      });
      if (!completes) return;

      // §8.2 — an offered item is always single-channel by construction (it
      // must be fully available before it can be offered — see createOffer's
      // available === quantity check), so marking it Transferred here still
      // holds even though the listing's own item (above) can now have other
      // open channels. Unlike the listing's item, this one keeps its
      // item_status write until the column itself is dropped in round 2.
      if (current.offerId !== null) {
        await tx.item.updateMany({
          where: { offerItems: { some: { offerId: current.offerId } } },
          data: { status: 'Transferred' },
        });
      }
    });
  }

  /**
   * §8.6 Shipping step 2 — the buyer confirms the parcel arrived. This is the
   * second condition, so it usually completes the transaction. The spec warns
   * this is irreversible, which is why the UI must gate it behind a
   * confirmation screen separate from the "track parcel" button.
   */
  async confirmDelivery(transactionId: number, userId: number) {
    const transaction = await this.loadOrThrow(this.prisma, transactionId);
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
    const transaction = await this.loadOrThrow(this.prisma, transactionId);
    this.assertNoActiveReport(transaction);
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
    const transaction = await this.loadOrThrow(this.prisma, transactionId);
    this.assertNoActiveReport(transaction);
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

  private async assertHandoverReady(transaction: TransactionRow) {
    const paid = transaction.paymentRequired;
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

  private refundFinished(transaction: {
    paymentConfirmedByBuyerAt: Date | null;
    refundConfirmedByBuyer: boolean;
    itemReceivedConfirmedByBuyerAt: Date | null;
    itemReturnConfirmedAt: Date | null;
  }) {
    const moneyReturned =
      !transaction.paymentConfirmedByBuyerAt ||
      transaction.refundConfirmedByBuyer;
    const goodsReturned =
      !transaction.itemReceivedConfirmedByBuyerAt ||
      transaction.itemReturnConfirmedAt;
    return Boolean(moneyReturned && goodsReturned);
  }

  /** Transaction_Refund is the 1:1 header every refund slip hangs off. */
  private async ensureRefund(tx: Db, transactionId: number) {
    await tx.transactionRefund.upsert({
      where: { transactionId },
      create: { transactionId },
      update: {},
    });
  }

  /** Seller submits refund evidence, starting the confirmation deadline. */
  async uploadRefundSlip(
    transactionId: number,
    userId: number,
    dto: UploadRefundSlipDto,
  ) {
    return this.mutate(transactionId, async (tx, transaction) => {
      this.assertIsSeller(transaction, userId);
      // Returning the money behind a rejected slip is not a cancellation, so
      // the deal stays Processing until the buyer confirms it arrived.
      const afterRejectedSlip = this.slipRejected(transaction);
      if (afterRejectedSlip) this.assertNoPendingCancellation(transaction);
      else this.assertRefundable(transaction);
      if (transaction.refundConfirmedByBuyer) {
        throw new BadRequestException('This refund has already been confirmed');
      }

      await this.ensureRefund(tx, transactionId);
      // A slip the buyer has not answered yet is replaced in place, which
      // keeps the confirmation deadline running from the first upload.
      if (transaction.refundSlipId !== null) {
        await tx.transactionRefundSlip.update({
          where: { refundSlipId: transaction.refundSlipId },
          data: { refundSlipUrl: dto.refund_slip_url },
        });
      } else {
        await tx.transactionRefundSlip.create({
          data: { transactionId, refundSlipUrl: dto.refund_slip_url },
        });
      }
      if (!afterRejectedSlip) {
        await tx.transaction.update({
          where: { transactionId },
          data: { status: TransactionStatus.PendingRefund },
        });
      }
    });
  }

  /**
   * The money behind a rejected slip is back with the buyer, so nothing is
   * owed either way: the deal returns to Pending, where the buyer can pay
   * again or either side can cancel. The rejected slip stays on record; the
   * refund evidence is removed, because the table allows one confirmed refund
   * slip per transaction and this deal may yet be paid and refunded for real.
   */
  private async voidRejectedPayment(tx: Db, transactionId: number) {
    await tx.transactionRefundSlip.deleteMany({ where: { transactionId } });
    await tx.transactionRefund.deleteMany({ where: { transactionId } });
    await tx.transaction.update({
      where: { transactionId },
      data: { status: TransactionStatus.Pending },
    });
  }

  /** Buyer acknowledges receipt; completed returns also require the goods. */
  async confirmRefund(transactionId: number, userId: number) {
    return this.mutate(transactionId, async (tx, transaction) => {
      this.assertIsBuyer(transaction, userId);
      if (this.slipRejected(transaction)) {
        this.assertNoPendingCancellation(transaction);
        if (!transaction.refundSlipUrl) {
          throw new BadRequestException(
            'The seller has not uploaded a refund slip yet',
          );
        }
        await this.voidRejectedPayment(tx, transactionId);
        return;
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

      await this.recordReturnProgress(tx, transaction, {
        refundConfirmedByBuyer: true,
      });
    });
  }

  private async recordReturnProgress(
    tx: Db,
    current: TransactionRow,
    progress: {
      refundConfirmedByBuyer?: true;
      itemReturnConfirmedAt?: Date;
    },
  ) {
    const { transactionId } = current;
    if (!['Pending Refund', 'Cancelled'].includes(current.status ?? ''))
      throw new BadRequestException('Return already completed');
    if (
      (progress.refundConfirmedByBuyer && current.refundConfirmedByBuyer) ||
      (progress.itemReturnConfirmedAt && current.itemReturnConfirmedAt)
    ) {
      throw new BadRequestException('This return step is already recorded');
    }
    if (progress.refundConfirmedByBuyer) {
      if (current.refundSlipId === null) {
        throw new BadRequestException(
          'The seller has not uploaded a refund slip yet',
        );
      }
      await tx.transactionRefundSlip.update({
        where: { refundSlipId: current.refundSlipId },
        data: { status: PaymentStatus.Confirmed, handledAt: new Date() },
      });
    }
    if (progress.itemReturnConfirmedAt) {
      const { itemReturnConfirmedAt } = progress;
      await tx.transactionRefund.upsert({
        where: { transactionId },
        create: { transactionId, itemReturnConfirmedAt },
        update: { itemReturnConfirmedAt },
      });
    }
    await tx.transaction.update({
      where: { transactionId },
      data: {
        status: this.refundFinished({ ...current, ...progress })
          ? TransactionStatus.Refunded
          : TransactionStatus.PendingRefund,
      },
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
    return this.mutate(transaction.transactionId, (tx, current) =>
      this.recordReturnProgress(tx, current, { itemReturnConfirmedAt }),
    );
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
  private async releaseReservation(tx: Db, postId: number, quantity: number) {
    await tx.post.update({
      where: { postId },
      data: { quantityRemaining: { increment: quantity } },
    });
  }

  /**
   * A cancellation that takes effect: Pending Refund if money or goods have
   * moved, otherwise Cancelled. The stock goes back on the market unless the
   * buyer is still holding the goods.
   */
  private async cancelTransaction(tx: Db, transaction: TransactionRow) {
    const { transactionId } = transaction;
    const owed =
      transaction.paymentConfirmedByBuyerAt ||
      transaction.itemReceivedConfirmedByBuyerAt;
    await tx.transaction.update({
      where: { transactionId },
      data: {
        status: owed
          ? TransactionStatus.PendingRefund
          : TransactionStatus.Cancelled,
      },
    });
    if (owed) await this.ensureRefund(tx, transactionId);
    if (!transaction.itemReceivedConfirmedByBuyerAt)
      await this.releaseReservation(
        tx,
        transaction.postId,
        transaction.quantity ?? 1,
      );
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
    return this.mutate(transactionId, async (tx, transaction) => {
      this.assertIsParty(transaction, userId);
      this.assertNoActiveReport(transaction);
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
      const requestedAt = new Date();
      await tx.transactionCancellation.create({
        data: {
          transactionId,
          requestedBy: userId,
          reason: dto.reason,
          requestedAt,
          response: immediate
            ? CancellationResponse.Approved
            : CancellationResponse.Pending,
          respondedAt: immediate ? requestedAt : null,
        },
      });
      if (immediate) {
        await tx.transaction.update({
          where: { transactionId },
          data: { status: TransactionStatus.Cancelled },
        });
        await this.releaseReservation(
          tx,
          transaction.postId,
          transaction.quantity ?? 1,
        );
      }
    });
  }

  /**
   * §8.7 — the other party answers.
   *
   *   Approved  → Cancelled, and the item goes back on the market.
   *   Rejected  → NOT cancelled and NOT auto-resolved. The dispute goes to an
   *               admin: a Transaction report is opened, and while it stays
   *               open the confirm buttons stay locked.
   *
   * The requester never answers their own request — that is the whole point of
   * requiring consent.
   */
  async respondToCancellation(
    transactionId: number,
    userId: number,
    dto: RespondCancellationDto,
  ) {
    return this.mutate(transactionId, async (tx, transaction) => {
      this.assertIsParty(transaction, userId);
      if (
        transaction.cancellationId === null ||
        transaction.cancellationRequestedBy === null ||
        transaction.cancellationResponse !== CancellationResponse.Pending
      ) {
        throw new BadRequestException('There is no pending request');
      }
      if (transaction.cancellationRequestedBy === userId)
        throw new ForbiddenException('The other party must respond');
      await tx.transactionCancellation.update({
        where: { cancellationId: transaction.cancellationId },
        data: { response: dto.response, respondedAt: new Date() },
      });
      if (dto.response === CancellationResponse.Approved) {
        await this.cancelTransaction(tx, transaction);
        return;
      }
      const report = await tx.report.create({
        data: {
          reporterId: transaction.cancellationRequestedBy,
          reportType: ReportType.Transaction,
          targetId: transactionId,
          reasonCategory: CANCELLATION_REJECTED_REASON,
          details: transaction.cancellationReason,
          status: ReportStatus.Pending,
        },
      });
      await notifyAdminsOfReport(tx, report);
    });
  }

  /**
   * The admin ruled on a report that locked this transaction (§8.7 and every
   * "go to the report flow" step in the activity diagram). The ruling decides
   * how the deal moves on. Closing the report is what releases the lock, so a
   * dismissed one needs nothing more here.
   *
   *   Rejected cancellation (the other side refused to cancel)
   *     upheld     the requester was right: the cancellation takes effect —
   *                Pending Refund if money or goods moved, else Cancelled and
   *                the stock goes back on the market
   *     dismissed  the deal carries on; the Rejected record stays as history
   *
   *   Seller did not confirm the payment slip in time
   *     upheld     the seller is at fault: the deal is cancelled and the
   *                buyer's money is owed back (Pending Refund)
   *     dismissed  the deal carries on from where it stopped
   *
   *   Buyer did not confirm the refund in time
   *     upheld     the refund counts as received, as if the buyer confirmed it
   *     dismissed  the deal carries on from where it stopped
   *
   * No-op for reports that do not lock a transaction.
   */
  async settleReportedTransaction(reportId: number, upheld: boolean) {
    const report = await this.prisma.report.findUnique({
      where: { reportId },
      select: { reportType: true, targetId: true, reasonCategory: true },
    });
    if (
      !upheld ||
      !report ||
      report.reportType !== ReportType.Transaction ||
      !isLockingReason(report.reasonCategory)
    )
      return;

    await this.mutate(report.targetId, async (tx, transaction) => {
      const cancellationDispute =
        transaction.cancellationResponse === CancellationResponse.Rejected;
      const slipUnconfirmed =
        transaction.status === TransactionStatus.Processing &&
        transaction.paymentConfirmedByBuyerAt !== null &&
        transaction.slipImageUrl !== null &&
        transaction.paymentConfirmedBySellerAt === null;

      if (cancellationDispute || slipUnconfirmed) {
        if (cancellationDispute && transaction.cancellationId !== null) {
          await tx.transactionCancellation.update({
            where: { cancellationId: transaction.cancellationId },
            data: { response: CancellationResponse.Approved },
          });
        }
        await this.cancelTransaction(tx, transaction);
        return;
      }

      const refundUnconfirmed =
        transaction.refundSubmittedAt !== null &&
        transaction.refundSlipUrl !== null &&
        !transaction.refundConfirmedByBuyer;
      if (!refundUnconfirmed) return;
      if (this.slipRejected(transaction)) {
        await this.voidRejectedPayment(tx, transaction.transactionId);
      } else {
        await this.recordReturnProgress(tx, transaction, {
          refundConfirmedByBuyer: true,
        });
      }
    });
  }
}
