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

export function SuccessDialog({
  triggerClassName,
  children,
}: {
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

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
        <Button
          className="w-full"
          onClick={() => router.push("/giveaway/manager")}
        >
          OK
        </Button>
      </DialogContent>
    </Dialog>
  );
}
