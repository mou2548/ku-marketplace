"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

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

export function RemoveItemDialog({
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
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Remove Item?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove{" "}
            <span className="font-medium text-foreground">{itemName}</span>{" "}
            from your inventory? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Item</AlertDialogCancel>
          <AlertDialogAction
            className="bg-[#BA1A1A] text-white hover:bg-[#BA1A1A]/90"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Remove Item
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
