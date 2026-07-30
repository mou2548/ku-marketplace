import { ReportType } from '../../../generated/prisma/client';

/**
 * Stand-in for a real Post/Transaction ownership lookup until those modules
 * exist. `target_id` on a Report means different things per report_type
 * (post_id, transaction_id, or user_id) — this maps the non-User cases to
 * the user_id that actually owns the target, so appeal ownership checks
 * compare user_id against user_id instead of post_id against user_id.
 * Swap this out for a real join against the Post/Transaction tables later.
 */
const MOCK_TARGET_OWNERS: Record<string, number> = {
  'Post:1': 1,
  'Post:2': 1,
  'Post:10': 1,
  'Post:42': 7,
  'Transaction:100': 3,
};

export function resolveTargetOwnerId(
  reportType: ReportType,
  targetId: number,
): number | undefined {
  return MOCK_TARGET_OWNERS[`${reportType}:${targetId}`];
}
