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

  /**
   * The mobile number the user's PromptPay is registered to; buyers are shown
   * a QR that pays it. Spaces and dashes are accepted. Null or an empty
   * string clears it.
   */
  @IsString()
  @IsOptional()
  @MaxLength(20)
  promptpay_id?: string | null;
}
