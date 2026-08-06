import { createZodDto } from 'nestjs-zod';
import { requestMembershipSchema, reviewMembershipSchema } from '../validation/membership.validation';

export class RequestMembershipDto extends createZodDto(requestMembershipSchema) {}
export class ReviewMembershipDto extends createZodDto(reviewMembershipSchema) {}
