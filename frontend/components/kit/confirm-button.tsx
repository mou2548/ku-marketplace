"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";

import { isActionFailure } from "@/lib/action-result";

import { Button, type ButtonProps } from "./button";
import { Overlay, OverlayTrigger } from "./overlay";

/**
 * A destructive (or otherwise consequential) action behind a confirmation
 * dialog — same shape as `report-dialog.tsx`: confirm, wait, show a brief
 * done state inside the same dialog rather than auto-closing on success, so
 * an error has somewhere to land too. Used for unlisting a channel and
 * deleting an item, neither of which had any UI control before this.
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel,
  doneMessage,
  variant = "danger",
  icon,
  onConfirm,
  onDone,
  trigger,
  triggerProps,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  doneMessage: string;
  variant?: ButtonProps["variant"];
  icon?: React.ReactNode;
  onConfirm: () => Promise<unknown>;
  /** Runs once, right after a successful confirm — e.g. navigating away from
   * a page whose subject no longer exists. Runs before the dialog's own
   * router.refresh(), so a redirect here pre-empts it. */
  onDone?: () => void;
  trigger: React.ReactNode;
  triggerProps?: Partial<ButtonProps>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function confirm() {
    setBusy(true);
    setError(undefined);
    try {
      // onConfirm may be a bound Server Action, which reports failure as data.
      const result = await onConfirm();
      if (isActionFailure(result)) throw new Error(result.error);
      setDone(true);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setBusy(false);
    setDone(false);
    setError(undefined);
  }

  return (
    <OverlayTrigger
      onOpenChange={(open) => {
        if (!open) {
          // The dialog only closes after a successful confirm (via the
          // "Done" button below) or an explicit cancel — either way, if
          // something changed server-side, the page needs the fresh state.
          if (done) router.refresh();
          reset();
        }
      }}
    >
      <Button {...triggerProps}>{trigger}</Button>
      <Overlay
        title={title}
        description={done ? undefined : description}
        isBusy={busy}
        footer={
          done ? (
            <Button slot="close">Close</Button>
          ) : (
            <>
              <Button variant="ghost" slot="close" isDisabled={busy}>
                Cancel
              </Button>
              <Button
                variant={variant}
                isLoading={busy}
                onPress={confirm}
              >
                {icon}
                {confirmLabel}
              </Button>
            </>
          )
        }
      >
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid size-11 place-items-center rounded-pill bg-tone-success-bg text-tone-success-fg">
              <CircleCheck aria-hidden className="size-5" />
            </span>
            <p className="text-body text-ink-secondary">{doneMessage}</p>
          </div>
        ) : error ? (
          <p className="rounded-control bg-tone-danger-bg p-3 text-body-sm text-tone-danger-fg">
            {error}
          </p>
        ) : null}
      </Overlay>
    </OverlayTrigger>
  );
}
