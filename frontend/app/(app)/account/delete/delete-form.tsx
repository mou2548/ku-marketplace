"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";
import { deleteAccount } from "@/lib/actions/account";

const CONFIRM_WORD = "DELETE";

/**
 * A destructive, irreversible action, so it is gated on typing the word rather
 * than on a second button. The consequences are listed before the control, not
 * after it — a warning under the button is a warning nobody reads.
 *
 * `blocked` comes from the page: flow 1 will not let someone walk away from a
 * deal that is mid-handover, so the button is disabled rather than the refusal
 * arriving from the server after the word has been typed.
 */
export function DeleteAccountForm({ blocked }: { blocked: number }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await deleteAccount();
    } catch (err) {
      setBusy(false);
      toast.show(err instanceof Error ? err.message : "Could not close account");
      return;
    }
    setBusy(false);
    toast.show("Account closed");
    router.push("/login");
  }

  return (
    <>
      <h1 className="text-h1">Close your account</h1>

      <Surface
        shape="card"
        elevation="flat"
        className="flex max-w-xl gap-3 bg-tone-danger-bg border-l-4 border-l-tone-danger-solid p-4"
      >
        <AlertTriangle
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-tone-danger-fg"
        />
        <div className="flex flex-col gap-2 text-[0.875rem] leading-[1.7] text-ink-secondary">
          <p className="font-semibold text-tone-danger-fg">
            This cannot be undone.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            <li>Your posts are removed from the market immediately.</li>
            <li>Open offers you made are withdrawn.</li>
            <li>
              Deals still in progress must be finished or cancelled first — you
              cannot leave someone mid-handover.
            </li>
            <li>
              Completed deals stay in the other party&apos;s history, because
              they are that person&apos;s evidence too.
            </li>
          </ul>
        </div>
      </Surface>

      {blocked > 0 ? (
        <p className="max-w-xl rounded-control bg-tone-warning-bg p-3 text-[0.875rem] leading-[1.7] text-tone-warning-fg">
          You have {blocked} deal{blocked === 1 ? "" : "s"} still in progress.
          Finish or cancel {blocked === 1 ? "it" : "them"} before closing the
          account.
        </p>
      ) : null}

      <TextInput
        label={`Type ${CONFIRM_WORD} to confirm`}
        value={confirm}
        onChange={setConfirm}
        placeholder={CONFIRM_WORD}
        className="max-w-xl"
      />

      <div className="flex max-w-xl flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onPress={() => router.back()}>
          Keep my account
        </Button>
        <Button
          variant="danger"
          isDisabled={confirm !== CONFIRM_WORD || blocked > 0}
          isLoading={busy}
          onPress={remove}
        >
          <Trash2 className="size-4" />
          Close account permanently
        </Button>
      </div>
    </>
  );
}
