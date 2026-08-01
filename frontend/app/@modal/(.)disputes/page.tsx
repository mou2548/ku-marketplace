"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Check,
  CloudUpload,
  PackageX,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// TODO: replace with the real 5 dispute reasons + evidence requirements from the API (proposal §7.5.3)
const REASONS = [
  { id: "no-payment", icon: Ban, label: "ไม่จ่ายเงินหรือส่งสลิปปลอม" },
  { id: "no-item", icon: PackageX, label: "ไม่ส่งสินค้าหรือไม่รับสินค้า" },
  { id: "not-as-described", icon: AlertTriangle, label: "สินค้าไม่ตรงตามที่ตกลงหรือเป็นของปลอม" },
  { id: "cancel-failed", icon: RefreshCcw, label: "ยกเลิกธุรกรรมไม่สำเร็จ" },
  { id: "refund-not-honored", icon: ShieldAlert, label: "ตกลงคืนเงินแล้วแต่ไม่ได้รับคืนจริง" },
];

function DisputeDrawerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tradeId = searchParams.get("trade");
  const [open, setOpen] = useState(true);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.back();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-[420px]">
        <SheetHeader className="border-b border-border/20 p-6">
          <SheetTitle className="text-xl">Report an Issue</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {tradeId ? `Trade #${tradeId}` : "Select a reason to continue."}
          </p>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-6">
          {REASONS.map((reason) => {
            const selected = selectedReason === reason.id;
            return (
              <button
                key={reason.id}
                type="button"
                onClick={() => setSelectedReason(reason.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  selected
                    ? "border-2 border-error bg-error-bg"
                    : "border-border/50 bg-white hover:bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    selected ? "bg-error text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  <reason.icon className="size-4" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {reason.label}
                </span>
                {selected && (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-error text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}

          <div className="flex flex-col gap-2 pt-2">
            <Label htmlFor="drawer-description" className="text-sm font-medium">
              What happened?
            </Label>
            <Textarea
              id="drawer-description"
              placeholder="Describe the issue..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <button
            type="button"
            className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-primary-light bg-primary-light/20 p-6 text-center transition-colors hover:bg-primary-light/40"
          >
            <CloudUpload className="size-6 text-primary-dark" />
            <span className="text-xs font-bold text-primary-dark">Upload evidence</span>
          </button>
        </div>

        <SheetFooter className="border-t border-border/20 p-6">
          <Button disabled={!selectedReason} className="h-12 w-full bg-error hover:bg-error/90">
            Submit Report
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function DisputesDrawer() {
  return (
    <Suspense fallback={null}>
      <DisputeDrawerForm />
    </Suspense>
  );
}
