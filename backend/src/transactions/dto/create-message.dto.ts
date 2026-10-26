import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5, { message: 'ส่งรูปภาพได้สูงสุด 5 รูปต่อข้อความ' })
  @IsOptional()
  image_urls?: string[];
}
