import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { MockAuthGuard } from '../common/guards/mock-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';

@Controller('transactions')
@UseGuards(MockAuthGuard)
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
}
