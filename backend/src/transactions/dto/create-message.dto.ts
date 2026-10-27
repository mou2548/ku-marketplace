import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  content?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5, { message: 'ส่งรูปภาพได้สูงสุด 5 รูปต่อข้อความ' })
  @IsOptional()
  image_urls?: string[];
}
