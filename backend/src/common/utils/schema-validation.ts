import { BadRequestException } from '@nestjs/common';

/** Match PostgreSQL varchar limits before sending data to Prisma. */
export function validateText(value: unknown, field: string, max: number) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string' || Array.from(value).length > max) {
    throw new BadRequestException(
      `${field} must be a string of at most ${max} characters`,
    );
  }
}
