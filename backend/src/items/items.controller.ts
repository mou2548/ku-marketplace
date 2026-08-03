import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

@Controller('items')
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

  @Get(':item_id')
  findOne(@Param('item_id', ParseIntPipe) itemId: number) {
    return this.itemsService.findOne(itemId);
  }

  @Post()
  create(@Body() createItemDto: CreateItemDto) {
    return this.itemsService.create(createItemDto);
  }

  @Patch(':item_id')
  update(
    @Param('item_id', ParseIntPipe) itemId: number,
    @Body() updateItemDto: UpdateItemDto,
    @Request() req,
  ) {
    const userId = req.user?.id ?? 1;
    return this.itemsService.update(itemId, updateItemDto, userId);
  }
  
  @Delete(':item_id')
  remove(
    @Param('item_id', ParseIntPipe) itemId: number,
    @Request() req,
  ) {
    const userId = req.user?.id ?? 1;
    return this.itemsService.remove(itemId, userId);
  }
}