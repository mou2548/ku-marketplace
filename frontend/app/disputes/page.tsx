"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  Check,
  CloudUpload,
  PackageX,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_RATE_LIMIT, REPORT_REASONS } from "@/lib/reports";
import { cn } from "@/lib/utils";

/**
 * Icons stay here because they are a display choice; the reason list itself
 * lives in lib/reports.ts so the admin console labels the same five reasons
 * the reporter picked from (§7.1).
 */
const REASON_ICONS: Record<string, typeof Ban> = {
  "no-payment": Ban,
  "no-item": PackageX,
  "not-as-described": AlertTriangle,
  "cancel-failed": RefreshCcw,
  "refund-not-honored": ShieldAlert,
};

function DisputeForm() {
  const searchParams = useSearchParams();
  const tradeId = searchParams.get("trade");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<File[]>([]);

  return (
    <Card className="w-full max-w-2xl flex-col gap-6 rounded-3xl p-8 shadow-elevated ring-0">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Report an Issue</h1>
        <p className="text-sm text-muted-foreground">
          {tradeId
            ? `Open a dispute for trade #${tradeId}. Our admin team reviews reports manually.`
            : "Select a reason and describe what happened. Our admin team reviews reports manually."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Reason</Label>
        {REPORT_REASONS.map((reason) => {
          const selected = selectedReason === reason.id;
          const Icon = REASON_ICONS[reason.id] ?? AlertTriangle;
          return (
            <button
              key={reason.id}
              type="button"
              onClick={() => setSelectedReason(reason.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                selected
                  ? "border-2 border-error bg-error-bg"
                  : "border-border/50 bg-white hover:bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  selected ? "bg-error text-white" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-semibold text-foreground">{reason.label}</span>
                <span className="text-xs text-muted-foreground">{reason.sub}</span>
              </div>
              {selected && (
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-error text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="dispute-description" className="text-sm font-medium">
          What happened?
        </Label>
        <Textarea
          id="dispute-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the issue with as much detail as possible..."
          className="min-h-[120px] resize-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Evidence</Label>
        <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary-light bg-primary-light/20 p-8 text-center transition-colors hover:bg-primary-light/40">
          <input
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            multiple
            className="hidden"
            onChange={(event) =>
              setEvidence(Array.from(event.target.files ?? []).slice(0, 5))
            }
          />
          <CloudUpload className="mb-2 size-8 stroke-[1.75] text-primary-dark" />
          <span className="text-sm font-bold text-primary-dark">
            {evidence.length > 0
              ? `${evidence.length} file${evidence.length > 1 ? "s" : ""} attached`
              : "Upload screenshots or slips"}
          </span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">
            Chat history, transfer slips, or photos of the item — up to 5 files
          </span>
        </label>
      </div>

      {/* §7.3 — a technical brake against bot spam and stuck fingers. It is
          not a judgement on the reporter: §7.2 forbids the system from scoring
          anyone's credibility. */}
      <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
        รายงานได้สูงสุด {REPORT_RATE_LIMIT.maxReports} ครั้งภายใน{" "}
        {REPORT_RATE_LIMIT.windowMinutes} นาที
        เกินกว่านั้นระบบจะบล็อกการรายงานชั่วคราว
      </p>

      <div className="flex gap-4 border-t border-border/20 pt-6">
        <Link
          href="/history"
          className="flex h-12 flex-1 items-center justify-center rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted"
        >
          Cancel
        </Link>
        <Button
          disabled={!selectedReason}
          className="h-12 flex-1 bg-error hover:bg-error/90"
        >
          Submit Report
        </Button>
      </div>
    </Card>
  );
}

export default function DisputesPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Suspense fallback={null}>
          <DisputeForm />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
