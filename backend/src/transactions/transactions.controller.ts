import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get(':id/message')
  getChatHistory(
    @Param('id', ParseIntPipe) transactionId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transactionsService.getChatHistory(transactionId, user.userId);
  }

  @Post(':id/message')
  sendMessage(
    @Param('id', ParseIntPipe) transactionId: number,
    @Body() createMessageDto: CreateMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transactionsService.sendMessage(
      transactionId,
      createMessageDto,
      user.userId,
    );
  }

  @Post(':id/appointment-cards')
  createAppointment(
    @Param('id', ParseIntPipe) transactionId: number,
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.transactionsService.createAppointment(
      transactionId,
      createAppointmentDto,
      user.userId,
    );
  }
}
