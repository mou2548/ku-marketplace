import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  first_name_en?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  last_name_en?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  first_name_th?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  last_name_th?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatar_url?: string;
}
