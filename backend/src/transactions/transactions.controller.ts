import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
  } from '@nestjs/common';
  import { TransactionsService } from './transactions.service';
  import { CreateMessageDto } from './dto/create-message.dto';
  import { CreateAppointmentDto } from './dto/create-appointment.dto';
  
  @Controller('transactions')
  export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) {}
  
    @Get(':id/message')
    getChatHistory(@Param('id', ParseIntPipe) transactionId: number) {
      return this.transactionsService.getChatHistory(transactionId);
    }
  
    @Post(':id/message')
    sendMessage(
      @Param('id', ParseIntPipe) transactionId: number,
      @Body() createMessageDto: CreateMessageDto,
    ) {
      return this.transactionsService.sendMessage(transactionId, createMessageDto);
    }
  
    @Post(':id/appointment-cards')
    createAppointment(
      @Param('id', ParseIntPipe) transactionId: number,
      @Body() createAppointmentDto: CreateAppointmentDto,
    ) {
      return this.transactionsService.createAppointment(
        transactionId,
        createAppointmentDto,
      );
    }
  }