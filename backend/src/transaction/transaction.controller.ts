import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { UploadPaymentSlipDto } from './dto/upload-payment-slip.dto';
import { ShipTransactionDto } from './dto/ship-transaction.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { UploadRefundSlipDto } from './dto/upload-refund-slip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { ClassValidatorPipe } from '../common/pipes/class-validator.pipe';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
@UsePipes(ClassValidatorPipe)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.transactionService.findAllForUser(user.userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transactionService.findOneForUser(id, user.userId);
  }

  /** §8.6 — buyer uploads the transfer slip and confirms: Pending → Processing */
  @Post(':id/payment-slip')
  @HttpCode(200)
  uploadPaymentSlip(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UploadPaymentSlipDto,
  ) {
    return this.transactionService.uploadPaymentSlip(id, user.userId, dto);
  }

  /** §8.6 — seller confirms the money arrived (1st of 2 conditions for Completed) */
  @Post(':id/confirm-payment-received')
  @HttpCode(200)
  confirmPaymentReceived(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transactionService.confirmPaymentReceived(id, user.userId);
  }

  /** §8.6 Shipping — seller records the tracking number (stays Processing) */
  @Post(':id/ship')
  @HttpCode(200)
  ship(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ShipTransactionDto,
  ) {
    return this.transactionService.ship(id, user.userId, dto);
  }

  /** §8.6 Shipping — buyer confirms receipt (2nd condition → Completed) */
  @Post(':id/confirm-delivery')
  @HttpCode(200)
  confirmDelivery(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transactionService.confirmDelivery(id, user.userId);
  }

  /** §8.6 Meetup — seller gets a 15-minute QR to show on screen */
  @Post(':id/qr/generate')
  @HttpCode(200)
  generateQr(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transactionService.generateQr(id, user.userId);
  }

  /** §8.6 Meetup — buyer confirms after scanning (2nd condition → Completed) */
  @Post(':id/qr/scan')
  @HttpCode(200)
  scanQr(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ScanQrDto,
  ) {
    return this.transactionService.scanQr(id, user.userId, dto);
  }

  /**
   * §10 issue #2 — evidence only. Records that the seller refunded the buyer
   * off-platform; it moves no money and does not change the status.
   */
  @Post(':id/refund-slip')
  @HttpCode(200)
  uploadRefundSlip(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UploadRefundSlipDto,
  ) {
    return this.transactionService.uploadRefundSlip(id, user.userId, dto);
  }

  /** §10 issue #2 — evidence only: buyer acknowledges the money arrived. */
  @Post(':id/confirm-refund')
  @HttpCode(200)
  confirmRefund(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transactionService.confirmRefund(id, user.userId);
  }
}
