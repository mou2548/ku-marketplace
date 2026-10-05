import { apiFetch } from "./client";
import { getAdminAppointmentCards, getAdminChatHistory } from "./chat";
import { authHeader } from "./session";
import { adminGetTransaction } from "./transactions";
import type {
  AppointmentCardData,
  ChatMessage,
  Report,
  Sanction,
  SubmittedReport,
  Transaction,
} from "./types";

/**
 * Wires §7's Report & Moderation table to `report.service.ts`/
 * `transaction.service.ts`'s real shapes. The backend already matches
 * `types.ts`'s `Report` field-for-field (it was built to, see
 * `report.service.ts`'s `serializeReport`), so this stays a thin pass-through
 * rather than a Raw-shape-plus-adapter pair — kept as its own module
 * regardless, to match every other `lib/api/*.ts` file's shape and give it
 * one place to adapt from if that ever changes.
 */

export type { Sanction };

export interface CreateReportInput {
  report_type: "Post" | "User" | "Transaction";
  target_id: number;
  reason_category: string;
  details?: string;
  evidence_urls?: string[];
}

export interface ResolveReportInput {
  status: "Violation_Confirmed" | "Report_Dismissed";
  sanction?: Sanction;
  resolution_note?: string;
}

async function authedInit(): Promise<RequestInit> {
  return { headers: await authHeader() };
}

/** POST /reports — §7.3's 5-per-10-minutes rate limit is enforced server-side. */
export async function createReport(input: CreateReportInput): Promise<SubmittedReport> {
  const init = await authedInit();
  return apiFetch<SubmittedReport>("/reports", {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** GET /reports — the signed-in user's own reports, without their outcome. */
export async function getMyReports(): Promise<SubmittedReport[]> {
  const init = await authedInit();
  return apiFetch<SubmittedReport[]>("/reports", init);
}

/** GET /reports/{id} — one of the user's own reports, without its outcome. */
export async function getReport(reportId: number): Promise<SubmittedReport> {
  const init = await authedInit();
  return apiFetch<SubmittedReport>(`/reports/${reportId}`, init);
}

/** GET /admin/reports — every report, oldest-first is the caller's job. */
export async function adminListReports(): Promise<Report[]> {
  const init = await authedInit();
  return apiFetch<Report[]>("/admin/reports", init);
}

/**
 * POST /admin/reports/{id}/open. Opening a case is taking it on: the first
 * admin to open a Pending report moves it to Under_Investigation and becomes
 * its `handled_by`. Returns the report either way, so it doubles as the
 * single-report read.
 */
export async function adminOpenReport(reportId: number): Promise<Report> {
  const init = await authedInit();
  return apiFetch<Report>(`/admin/reports/${reportId}/open`, {
    ...init,
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * POST /admin/reports/{id}/resolve. `sanction` only has an effect when
 * `status` is `Violation_Confirmed` — see `report.service.ts`'s `resolve()`.
 */
export async function adminResolveReport(
  reportId: number,
  input: ResolveReportInput,
): Promise<Report> {
  const init = await authedInit();
  return apiFetch<Report>(`/admin/reports/${reportId}/resolve`, {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface AdminTransactionEvidence {
  transaction: Transaction;
  messages: ChatMessage[];
  appointmentCards: AppointmentCardData[];
}

/**
 * §7.1/§7.5.3 — bundles the 3 `GET /admin/transactions/...` routes
 * (`lib/api/transactions.ts`'s `adminGetTransaction`, `lib/api/chat.ts`'s
 * `getAdminChatHistory`/`getAdminAppointmentCards`) for the verdict screen.
 * Only meaningful for a `Transaction`-type report; callers check
 * `report.report_type === "Transaction"` before calling this.
 */
export async function adminGetTransactionEvidence(
  transactionId: number,
): Promise<AdminTransactionEvidence> {
  const [transaction, chat, appointmentCards] = await Promise.all([
    adminGetTransaction(transactionId),
    getAdminChatHistory(transactionId),
    getAdminAppointmentCards(transactionId),
  ]);
  return { transaction, messages: chat.messages, appointmentCards };
}
