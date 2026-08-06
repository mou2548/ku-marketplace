"use client";

import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Dialog chrome for intercepted routes. Keeping it separate lets the page
 * itself stay a server component, so the same body renders in the modal and on
 * the full page without duplicating markup.
 *
 * `title` is rendered screen-reader-only: the visible heading lives in the
 * body, but base-ui still needs a labelled dialog.
 */
export function ModalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[480px] gap-6 rounded-3xl bg-transparent p-0 shadow-none ring-0"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="flex w-full flex-col gap-6 rounded-3xl bg-popover p-8 shadow-elevated">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
