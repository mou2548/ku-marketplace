import { ValidationPipe } from '@nestjs/common';

/**
 * Scoped to the Report/Appeal controllers on purpose — it must NOT be
 * registered globally in main.ts.
 *
 * The other modules (auth, posts, giveaways) validate with `nestjs-zod`
 * (`createZodDto`), whose DTOs carry no class-validator decorators. A global
 * pipe with `whitelist: true` strips every undecorated property, which empties
 * their request bodies entirely — e.g. /auth/login receives `{}`, so
 * `payload.email` is undefined and Prisma throws. Keeping it per-controller
 * validates our class-validator DTOs without touching theirs.
 */
export const ReportValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
});
