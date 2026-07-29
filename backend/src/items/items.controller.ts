import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
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
  
    // Declared BEFORE :item_id to prevent collision
    @Get('categories')
    getCategories() {
      return this.itemsService.getCategories();
    }
  
    @Get(':item_id')
    findOne(@Param('item_id', ParseIntPipe) itemId: number) {
      return this.itemsService.findOne(itemId);
    }
  
    @Post()
    create(@Body() createItemDto: CreateItemDto) {
      // In production, owner_id comes from req.user.user_id via JWT Auth
      const mockOwnerId = 1;
      return this.itemsService.create(createItemDto, mockOwnerId);
    }
  
    @Patch(':item_id')
    update(
      @Param('item_id', ParseIntPipe) itemId: number,
      @Body() updateItemDto: UpdateItemDto,
    ) {
      return this.itemsService.update(itemId, updateItemDto);
    }
  
    @Delete(':item_id')
    remove(@Param('item_id', ParseIntPipe) itemId: number) {
      return this.itemsService.remove(itemId);
    }
  }