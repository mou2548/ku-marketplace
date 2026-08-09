"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/field";
import { Surface } from "@/components/kit/surface";
import { useToast } from "@/components/kit/toast";

const CONFIRM_WORD = "DELETE";

/**
 * A destructive, irreversible action, so it is gated on typing the word rather
 * than on a second button. The consequences are listed before the control, not
 * after it — a warning under the button is a warning nobody reads.
 */
export default function DeleteAccountPage() {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    // DELETE /users/me
    await new Promise((r) => setTimeout(r, 400));
    setBusy(false);
    toast.show("Account closed");
    router.push("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-[-0.016em]">
        Close your account
      </h1>

      <Surface
        shape="card"
        elevation="flat"
        className="flex gap-3 bg-tone-danger-bg border-l-4 border-l-tone-danger-solid p-4"
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

      <TextInput
        label={`Type ${CONFIRM_WORD} to confirm`}
        value={confirm}
        onChange={setConfirm}
        placeholder={CONFIRM_WORD}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onPress={() => router.back()}>
          Keep my account
        </Button>
        <Button
          variant="danger"
          isDisabled={confirm !== CONFIRM_WORD}
          isLoading={busy}
          onPress={remove}
        >
          <Trash2 className="size-4" />
          Close account permanently
        </Button>
      </div>
    </div>
  );
}
