"use server";

import { runAction, type ActionResult } from "@/lib/action-result";
import {
  adminOpenReport as adminOpenReportApi,
  adminResolveReport as adminResolveReportApi,
  createReport as createReportApi,
  type CreateReportInput,
  type ResolveReportInput,
} from "@/lib/api/reports";
import { getAccessToken } from "@/lib/api/session";
import type { Report, SubmittedReport } from "@/lib/api/types";

async function requireSession() {
  if (!(await getAccessToken())) throw new Error("Not signed in");
}

/** §7.1/§7.5 — one report, one of three types. §7.3's rate limit and the
 * fixed reason-category list are enforced by the caller/server, not here. */
export async function createReport(input: CreateReportInput): Promise<ActionResult<SubmittedReport>> {
  return runAction(async () => {
    await requireSession();
    return createReportApi(input);
  });
}

export async function adminOpenReport(reportId: number): Promise<ActionResult<Report>> {
  return runAction(async () => {
    await requireSession();
    return adminOpenReportApi(reportId);
  });
}

export async function adminResolveReport(
  reportId: number,
  input: ResolveReportInput,
): Promise<ActionResult<Report>> {
  return runAction(async () => {
    await requireSession();
    return adminResolveReportApi(reportId, input);
  });
}
