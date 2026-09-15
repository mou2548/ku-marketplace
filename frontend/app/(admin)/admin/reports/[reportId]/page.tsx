import { notFound } from "next/navigation";

import { adminGetTransactionEvidence, adminListReports } from "@/lib/api/reports";

import { VerdictForm } from "./verdict-form";

export default async function AdminReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const reports = await adminListReports();
  const report = reports.find((r) => r.report_id === Number(reportId));
  if (!report) notFound();

  // §7.1/§7.5.3 — "the chat, slips, and timestamps are attached to this case
  // automatically" is only true for a Transaction report; Post/User reports
  // have no transaction to pull evidence from.
  const evidence =
    report.report_type === "Transaction"
      ? await adminGetTransactionEvidence(report.target_id).catch(() => undefined)
      : undefined;

  return <VerdictForm report={report} evidence={evidence} />;
}
