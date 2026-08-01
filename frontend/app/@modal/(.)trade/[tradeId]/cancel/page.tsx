"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function TradeCancelModal() {
  const router = useRouter();

  function confirmCancel() {
    router.push("/history");
  }

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[440px] items-center gap-6 rounded-3xl p-8 text-center"
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-error-bg">
          <X className="size-7 text-error" />
        </div>

        <div className="flex flex-col gap-2">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Cancel this trade?
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this trade? This action cannot be
            undone, and you&apos;ll need to start a new offer if you change
            your mind.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={confirmCancel}
            className="h-12 w-full bg-error hover:bg-error/90"
          >
            Confirm Cancellation
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-12 w-full"
          >
            Keep Trade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
