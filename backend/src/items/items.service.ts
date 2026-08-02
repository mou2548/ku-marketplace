import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Get total count of items
  async count() {
    const count = await this.prisma.item.count();
    return { count };
  }

  // 2. Fetch distinct categories from items table
  async getCategories() {
    const categories = await this.prisma.item.groupBy({
      by: ['category'],
    });
    return categories.map((c) => c.category);
  }

  // 3. Create a new item
  async create(createItemDto: CreateItemDto) {
    const { images, warranty_expiry, ...itemData } = createItemDto;

    return this.prisma.item.create({
      data: {
        ...itemData,
        owner_id: 1, 
        warranty_expiry: warranty_expiry ? new Date(warranty_expiry) : null,

        Item_Image:
          images && images.length > 0
            ? {
                create: images.map((img) => ({
                  image_url: img.image_url,
                  is_primary: img.is_primary ?? false,
                  display_order: img.display_order ?? 0,
                })),
              }
            : undefined,
      },
      include: {
        Item_Image: true,
      },
    });
  }

  // 4. Find all items
  async findAll() {
    return this.prisma.item.findMany({
      include: {
        Item_Image: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  // 5. Find single item by ID
  async findOne(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { item_id: id },
      include: {
        Item_Image: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  // 6. Update item
  async update(id: number, updateItemDto: UpdateItemDto) {
    const { images, warranty_expiry, ...itemData } = updateItemDto;

    try {
      return await this.prisma.item.update({
        where: { item_id: id },
        data: {
          ...itemData,
          ...(warranty_expiry !== undefined && {
            warranty_expiry: warranty_expiry ? new Date(warranty_expiry) : null,
          }),
          ...(images && {
            Item_Image: {
              deleteMany: {},
              create: images.map((img) => ({
                image_url: img.image_url,
                is_primary: img.is_primary ?? false,
                display_order: img.display_order ?? 0,
              })),
            },
          }),
        },
        include: {
          Item_Image: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }
      throw error;
    }
  }

  // 7. Delete item
  async remove(id: number) {
    try {
      return await this.prisma.item.delete({
        where: { item_id: id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }
      throw error;
    }
  }
}