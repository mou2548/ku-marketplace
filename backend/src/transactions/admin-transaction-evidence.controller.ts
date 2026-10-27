import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

/**
 * §7.1/§7.5.3 — "แอดมินตรวจสอบหลักฐานประกอบกับประวัติการสนทนาในห้องแชทของ
 * ธุรกรรมที่เกี่ยวข้อง". Before this, `TransactionController`/`TransactionsController`
 * only let the buyer or seller in (`assertParticipant`/`findOneForUser`) —
 * an admin reviewing a report is neither, and had no way to read any of it.
 * Kept as its own controller, not folded into either existing one, because
 * neither `TransactionService` nor `TransactionsService` is exported to a
 * module the other lives in; both are already available at `AppModule`'s
 * scope (`TransactionModule` exports the former, the latter is a raw
 * `AppModule` provider — same place `TransactionsController` itself is
 * registered), so this is too.
 */
@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminTransactionEvidenceController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transactionService.findOneForAdmin(id);
  }

  @Get(':id/message')
  getMessages(@Param('id', ParseIntPipe) id: number) {
    return this.transactionsService.getChatHistoryForAdmin(id);
  }

  @Get(':id/appointment-cards')
  getAppointmentCards(@Param('id', ParseIntPipe) id: number) {
    return this.transactionsService.getAppointmentCardsForAdmin(id);
  }
}
