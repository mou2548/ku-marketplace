import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadPaymentSlipDto {
  // R2 returns a URL path that gets stored here — the file itself never goes
  // into Postgres (PROJECT_STANDARDS §5). Column is VARCHAR(500).
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  slip_image_url: string;
}
