import { notFound } from "next/navigation";

import { adminListAppeals } from "@/lib/api/appeals";

import { AppealCase } from "./appeal-case";

export const metadata = { title: "Appeal - Admin" };

export default async function AdminAppealPage({
  params,
}: {
  params: Promise<{ appealId: string }>;
}) {
  const { appealId } = await params;
  const appeals = await adminListAppeals();
  const appeal = appeals.find((a) => a.appeal_id === Number(appealId));
  if (!appeal) notFound();

  // Keyed on status so a decision's router.refresh() remounts with fresh data
  // instead of keeping the pre-decision copy in state.
  return (
    <AppealCase
      key={`${appeal.appeal_id}-${appeal.status}`}
      appeal={appeal}
    />
  );
}
