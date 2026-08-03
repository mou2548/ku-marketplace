import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async count() {
    const count = await this.prisma.item.count();
    return { count };
  }

  async getCategories() {
    const categories = await this.prisma.item.groupBy({
      by: ['category'],
    });
    return categories.map((c) => c.category);
  }

  async create(createItemDto: CreateItemDto) {
    const {
      images,
      warranty_expiry,
      course_name,
      brand_model,
      ...itemData
    } = createItemDto as any;

    return this.prisma.item.create({
      data: {
        ...itemData,
        ownerId: 1,
        courseName: course_name ?? itemData.courseName,
        brandModel: brand_model ?? itemData.brandModel,
        warrantyExpiry: warranty_expiry ? new Date(warranty_expiry) : null,
        images:
          images && images.length > 0
            ? {
                create: images.map((img) => ({
                  imageUrl: img.image_url ?? img.imageUrl,
                  isPrimary: img.is_primary ?? img.isPrimary ?? false,
                  displayOrder: img.display_order ?? img.displayOrder ?? 0,
                })),
              }
            : undefined,
      },
      include: {
        images: true,
      },
    });
  }

  async findAll() {
    return this.prisma.item.findMany({
      include: {
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { itemId: id },
      include: {
        images: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto, userId: number) {
    const item = await this.prisma.item.findUnique({
      where: { itemId: id },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    if (item.ownerId !== userId) {
      throw new ForbiddenException('You are not authorized to update this item');
    }

    const {
      images,
      warranty_expiry,
      course_name,
      brand_model,
      ...itemData
    } = updateItemDto as any;

    return this.prisma.item.update({
      where: { itemId: id },
      data: {
        ...itemData,
        ...(course_name !== undefined && { courseName: course_name }),
        ...(brand_model !== undefined && { brandModel: brand_model }),
        ...(warranty_expiry !== undefined && {
          warrantyExpiry: warranty_expiry ? new Date(warranty_expiry) : null,
        }),
        ...(images && {
          images: {
            deleteMany: {},
            create: images.map((img) => ({
              imageUrl: img.image_url ?? img.imageUrl,
              isPrimary: img.is_primary ?? img.isPrimary ?? false,
              displayOrder: img.display_order ?? img.displayOrder ?? 0,
            })),
          },
        }),
      },
      include: {
        images: true,
      },
    });
  }

  async remove(id: number, userId: number) {
    const item = await this.prisma.item.findUnique({
      where: { itemId: id },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    if (item.ownerId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this item');
    }

    return this.prisma.item.delete({
      where: { itemId: id },
    });
  }
}