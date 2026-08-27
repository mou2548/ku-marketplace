import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class CreateItemImageDto {
  @IsString()
  @IsNotEmpty()
  image_url: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;

  @IsInt()
  @IsOptional()
  display_order?: number;
}

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  course_name?: string;

  @IsString()
  @IsOptional()
  brand_model?: string;

  @IsDateString()
  @IsOptional()
  warranty_expiry?: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateItemImageDto)
  images?: CreateItemImageDto[];
}
