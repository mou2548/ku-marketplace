import { IsEnum } from 'class-validator';
import { CancellationResponse } from '../../common/enums/transaction.enums';

// 'Pending' is the waiting state, so it is not something a responder may send.
const DECIDABLE_RESPONSES = [
  CancellationResponse.Approved,
  CancellationResponse.Rejected,
] as const;

export class RespondCancellationDto {
  @IsEnum(DECIDABLE_RESPONSES)
  response: (typeof DECIDABLE_RESPONSES)[number];
}
