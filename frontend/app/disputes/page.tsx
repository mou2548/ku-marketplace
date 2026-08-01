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
import { cn } from "@/lib/utils";

// TODO: replace with the real 5 dispute reasons + evidence requirements from the API (proposal §7.5.3)
const REASONS = [
  {
    id: "no-payment",
    icon: Ban,
    label: "ไม่จ่ายเงินหรือส่งสลิปปลอม",
    sub: "Payment not received, or a fake transfer slip",
  },
  {
    id: "no-item",
    icon: PackageX,
    label: "ไม่ส่งสินค้าหรือไม่รับสินค้า",
    sub: "Item not sent, or not received at handover",
  },
  {
    id: "not-as-described",
    icon: AlertTriangle,
    label: "สินค้าไม่ตรงตามที่ตกลงหรือเป็นของปลอม",
    sub: "Item doesn't match what was agreed, or is counterfeit",
  },
  {
    id: "cancel-failed",
    icon: RefreshCcw,
    label: "ยกเลิกธุรกรรมไม่สำเร็จ",
    sub: "Cancellation request wasn't honored by the other party",
  },
  {
    id: "refund-not-honored",
    icon: ShieldAlert,
    label: "ตกลงคืนเงินแล้วแต่ไม่ได้รับคืนจริง",
    sub: "A refund was agreed but never actually sent",
  },
];

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
        {REASONS.map((reason) => {
          const selected = selectedReason === reason.id;
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
                <reason.icon className="size-5" />
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
