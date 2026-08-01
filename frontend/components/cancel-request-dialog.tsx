"use client";

import { useState } from "react";
import { XCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CancelRequestDialog({
  itemName,
  triggerClassName,
  onConfirm,
  children,
}: {
  itemName: string;
  triggerClassName?: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {children}
      </button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-error-bg text-error">
            <XCircle />
          </AlertDialogMedia>
          <AlertDialogTitle>Cancel Giveaway Request?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel your request for{" "}
            <span className="font-medium text-foreground">{itemName}</span>?
            This action cannot be undone and you will lose your spot in the
            queue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Request</AlertDialogCancel>
          <AlertDialogAction
            className="bg-[#BA1A1A] text-white hover:bg-[#BA1A1A]/90"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Confirm Cancellation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
