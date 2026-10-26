import { UsePipes } from '@nestjs/common';
import { ClassValidatorPipe } from '../common/pipes/class-validator.pipe';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/current-user.interface';

@Controller('items')
@UsePipes(ClassValidatorPipe)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @Get('categories')
  getCategories() {
    return this.itemsService.getCategories();
  }

  @Get('count')
  count() {
    return this.itemsService.count();
  }

  @Get(':item_id/history-summary')
  @UseGuards(JwtAuthGuard)
  historySummary(
    @Param('item_id', ParseIntPipe) itemId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.itemsService.historySummary(itemId, user.userId);
  }

  @Get(':item_id')
  findOne(@Param('item_id', ParseIntPipe) itemId: number) {
    return this.itemsService.findOne(itemId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createItemDto: CreateItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.itemsService.create(createItemDto, user.userId);
  }

  @Patch(':item_id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('item_id', ParseIntPipe) itemId: number,
    @Body() updateItemDto: UpdateItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.itemsService.update(itemId, updateItemDto, user.userId);
  }

  @Delete(':item_id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('item_id', ParseIntPipe) itemId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.itemsService.remove(itemId, user.userId);
  }
}
