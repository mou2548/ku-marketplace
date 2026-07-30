import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsDateString, 
  ValidateIf, 
  IsArray, 
  ValidateNested ,
  IsEnum
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemCondition } from '@prisma/client';

export class CreateItemImageDto {
  @IsString()
  @IsNotEmpty()
  image_url: string;

  @IsOptional()
  is_primary?: boolean;

  @IsOptional()
  display_order?: number;
}

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ItemCondition, { message: `condition must be a valid ItemCondition enum value` })
  @IsNotEmpty()
  condition: ItemCondition;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category: string; // รับเป็น slug เช่น 'textbooks', 'electronics', 'clothing'

  // -------------------------------------------------------------
  // 📌 Conditional Fields
  // -------------------------------------------------------------

  // 1. หมวดหมู่: หนังสือ/ตำราเรียน (textbooks) -> บังคับ course_name
  @ValidateIf((o) => o.category === 'textbooks')
  @IsString({ message: 'ชื่อวิชา (course_name) จำเป็นต้องระบุสำหรับหมวดหมู่หนังสือ/ตำราเรียน' })
  @IsNotEmpty({ message: 'ชื่อวิชา (course_name) ห้ามเป็นค่าว่าง' })
  course_name?: string;

  // 2. หมวดหมู่: อิเล็กทรอนิกส์ (electronics) -> บังคับ brand_model
  @ValidateIf((o) => o.category === 'electronics')
  @IsString({ message: 'ยี่ห้อ/รุ่น (brand_model) จำเป็นต้องระบุสำหรับหมวดหมู่อิเล็กทรอนิกส์' })
  @IsNotEmpty({ message: 'ยี่ห้อ/รุ่น (brand_model) ห้ามเป็นค่าว่าง' })
  brand_model?: string;

  // วันหมดประกัน (ถ้ามี สามารถระบุเพิ่มได้)
  @IsOptional()
  @IsDateString({}, { message: 'warranty_expiry ต้องเป็นรูปแบบวันที่ ISO8601 ที่ถูกต้อง' })
  warranty_expiry?: string;

  // 3. หมวดหมู่: เสื้อผ้า/แฟชั่น (clothing) -> บังคับ size
  @ValidateIf((o) => o.category === 'clothing')
  @IsString({ message: 'ไซส์ (size) จำเป็นต้องระบุสำหรับหมวดหมู่เสื้อผ้า/แฟชั่น' })
  @IsNotEmpty({ message: 'ไซส์ (size) ห้ามเป็นค่าว่าง' })
  size?: string;

  // -------------------------------------------------------------

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemImageDto)
  images?: CreateItemImageDto[];
}