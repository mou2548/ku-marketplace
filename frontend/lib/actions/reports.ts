"use server";

import {
  adminResolveReport as adminResolveReportApi,
  adminRestoreReport as adminRestoreReportApi,
  createReport as createReportApi,
  type CreateReportInput,
  type ResolveReportInput,
} from "@/lib/api/reports";
import { getAccessToken } from "@/lib/api/session";
import type { Report } from "@/lib/api/types";

async function requireSession() {
  if (!(await getAccessToken())) throw new Error("Not signed in");
}

/** §7.1/§7.5 — one report, one of three types. §7.3's rate limit and the
 * fixed reason-category list are enforced by the caller/server, not here. */
export async function createReport(input: CreateReportInput): Promise<Report> {
  await requireSession();
  return createReportApi(input);
}

export async function adminResolveReport(
  reportId: number,
  input: ResolveReportInput,
): Promise<Report> {
  await requireSession();
  return adminResolveReportApi(reportId, input);
}

export async function adminRestoreReport(reportId: number): Promise<Report> {
  await requireSession();
  return adminRestoreReportApi(reportId);
}
