import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';

export enum ItemCondition {
  NEW = 'new',
  VERY_GOOD = 'very_good',
  GOOD = 'good',
  ACCEPTABLE = 'acceptable',
}

export class ItemImageDto {
  @IsUrl()
  @IsNotEmpty()
  image_url: string;

  @IsBoolean()
  is_primary: boolean;

  @IsNumber()
  @Min(0)
  display_order: number;
}

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsEnum(ItemCondition)
  @IsNotEmpty()
  condition: ItemCondition;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemImageDto)
  images: ItemImageDto[];

  @IsString()
  @IsOptional()
  course_name?: string;

  @IsString()
  @IsOptional()
  brand_model?: string;

  @IsString()
  @IsOptional()
  warranty_expiry?: string;

  @IsString()
  @IsOptional()
  size?: string;
}