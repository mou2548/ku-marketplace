"use client";

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
  children,
}: {
  triggerClassName?: string;
  itemName: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function handleConfirm() {
    addNotification({
      title: "ลงทะเบียนรับของสำเร็จ",
      subtitle: itemName,
    });
    router.push("/giveaway/manager");
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button className={triggerClassName} />}>
        {children}
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="text-center">
        <DialogHeader className="items-center">
          <CheckCircle2 className="size-10 text-primary" />
          <DialogTitle className="text-lg">Success</DialogTitle>
        </DialogHeader>
        <Button className="w-full" onClick={handleConfirm}>
          OK
        </Button>
      </DialogContent>
    </Dialog>
  );
}
