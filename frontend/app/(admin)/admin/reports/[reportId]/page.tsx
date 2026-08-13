import { notFound } from "next/navigation";

import { getAdminReports } from "@/lib/api/fixtures";

import { VerdictForm } from "./verdict-form";

export default async function AdminReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const reports = await getAdminReports();
  const report = reports.find((r) => r.report_id === Number(reportId));
  if (!report) notFound();

  return <VerdictForm report={report} />;
}
