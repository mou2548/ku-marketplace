import { redirect } from "next/navigation";

import { getEligibleAppeals } from "@/lib/api/appeals";
import { getAccessToken } from "@/lib/api/session";

import { AppealForm } from "./appeal-form";

export const metadata = { title: "Submit an appeal - KU Marketplace" };

/**
 * The decisions the user can still appeal come from the API, so the form
 * offers them to pick from; `?report=` (from "Appeal this decision") selects
 * one up front.
 */
export default async function NewAppealPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  if (!(await getAccessToken())) redirect("/login");
  const [{ report }, decisions] = await Promise.all([
    searchParams,
    getEligibleAppeals().catch(() => []),
  ]);
  const initialReportId = /^[1-9]\d*$/.test(report ?? "") ? Number(report) : null;

  return <AppealForm decisions={decisions} initialReportId={initialReportId} />;
}
