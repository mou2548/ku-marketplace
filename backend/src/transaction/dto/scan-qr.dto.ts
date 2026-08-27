import { IsNotEmpty, IsString } from 'class-validator';

export class ScanQrDto {
  // The random token carried by the QR the seller is showing on screen.
  // Opaque on purpose — §8.6 requires no personal data inside the code.
  @IsString()
  @IsNotEmpty()
  token: string;
}
