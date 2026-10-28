/**
 * A report needs words, not just a category: an admin cannot decide from
 * "Scam" alone. The backend enforces the same minimum on the trimmed text
 * (`CreateReportDto.details`), so a change here has to change there too.
 */
export const REPORT_DETAILS_MIN = 10;

export function isReportDetailsValid(details: string): boolean {
  return details.trim().length >= REPORT_DETAILS_MIN;
}
