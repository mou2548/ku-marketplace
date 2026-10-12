import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  MaxLength,
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

  @IsIn(['New', 'Good', 'Acceptable', 'Poor'])
  condition: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

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
