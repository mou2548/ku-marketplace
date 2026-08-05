"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addNotification } from "@/lib/notifications";

export function SuccessDialog({
  triggerClassName,
  itemName,
  onConfirm,
  children,
}: {
  triggerClassName?: string;
  itemName: string;
  /** Called when the dialog opens — should perform the API call (e.g. join). */
  onConfirm?: () => Promise<void>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    if (!onConfirm) {
      setStatus("done");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      await onConfirm();
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "การดำเนินการล้มเหลว กรุณาลองใหม่");
    }
  }

  function handleDone() {
    addNotification({
      title: "ลงทะเบียนรับของสำเร็จ",
      subtitle: itemName,
    });
    setOpen(false);
    router.push("/giveaway/manager");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className={triggerClassName} />}>
        {children}
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="text-center">
        {status === "error" ? (
          <>
            <DialogHeader className="items-center">
              <DialogTitle className="text-lg">เกิดข้อผิดพลาด</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
              ปิด
            </Button>
          </>
        ) : (
          <>
            <DialogHeader className="items-center">
              <CheckCircle2 className="size-10 text-primary" />
              <DialogTitle className="text-lg">
                {status === "loading" ? "กำลังดำเนินการ..." : "Success"}
              </DialogTitle>
            </DialogHeader>
            <Button className="w-full" disabled={status === "loading"} onClick={handleDone}>
              OK
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
