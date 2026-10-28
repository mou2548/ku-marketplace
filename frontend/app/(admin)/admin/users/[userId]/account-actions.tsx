"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw } from "lucide-react";

import {
  AdminButton,
  AdminRadio,
  AdminRadioGroup,
  AdminTextArea,
} from "@/components/admin/admin-controls";
import { Overlay } from "@/components/kit/overlay";
import { useToast } from "@/components/kit/toast";
import { unwrapAction } from "@/lib/action-result";
import { reinstateUser, suspendUser } from "@/lib/actions/admin";
import type { AccountStatus, AdminSanction } from "@/lib/api/admin";
import {
  APPEAL_WINDOW_DAYS,
  TEMPORARY_SUSPENSION_DAYS,
} from "@/lib/admin-labels";

/** Mirrors `SanctionUserDto` on the backend. */
const REASON_MIN = 10;
const REASON_MAX = 1000;

/**
 * Suspend, ban or reinstate an account by hand (team ruling 2026-10-27). A
 * suspension is recorded as a confirmed report, so the member is notified and
 * may appeal it like any other verdict. Reinstating reverses every verdict
 * still holding the account.
 */
export function AccountActions({
  userId,
  name,
  status,
}: {
  userId: number;
  name: string;
  status: AccountStatus | null;
}) {
  if (status === "Deleted") return null;
  if (status === "Suspended" || status === "Banned")
    return <ReinstateButton userId={userId} name={name} />;
  return <SuspendButton userId={userId} name={name} />;
}

function SuspendButton({ userId, name }: { userId: number; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sanction, setSanction] = useState<AdminSanction>("suspend_temporary");
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const valid = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;

  async function submit() {
    setBusy(true);
    try {
      await unwrapAction(suspendUser(userId, sanction, trimmed));
    } catch (err) {
      setBusy(false);
      toast.error(
        err instanceof Error ? err.message : "Could not suspend the account",
      );
      return;
    }
    setBusy(false);
    setOpen(false);
    setReason("");
    toast.success(
      sanction === "suspend_permanent"
        ? `${name} is banned.`
        : `${name} is suspended for ${TEMPORARY_SUSPENSION_DAYS} days.`,
    );
    router.refresh();
  }

  return (
    <>
      <AdminButton onPress={() => setOpen(true)}>
        <Ban aria-hidden />
        Suspend or ban
      </AdminButton>
      <Overlay
        isOpen={open}
        onOpenChange={setOpen}
        isBusy={busy}
        title={`Suspend ${name}`}
        description={`They are told why and can appeal within ${APPEAL_WINDOW_DAYS} days.`}
        footer={
          <>
            <AdminButton tone="plain" onPress={() => setOpen(false)} isDisabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              onPress={submit}
              isDisabled={!valid}
              isLoading={busy}
            >
              {sanction === "suspend_permanent" ? "Ban account" : "Suspend account"}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <AdminRadioGroup
            label="Penalty"
            value={sanction}
            onChange={(v) => setSanction(v as AdminSanction)}
          >
            <AdminRadio
              value="suspend_temporary"
              label={`Suspend for ${TEMPORARY_SUSPENSION_DAYS} days`}
              description="The account is restored on its own when the time is up."
            />
            <AdminRadio
              value="suspend_permanent"
              label="Ban permanently"
              description="Lasts until an appeal is upheld or you reinstate the account."
            />
          </AdminRadioGroup>
          <AdminTextArea
            label="Reason"
            hint={`Shown to the member. At least ${REASON_MIN} characters.`}
            value={reason}
            onChange={setReason}
            rows={4}
          />
        </div>
      </Overlay>
    </>
  );
}

function ReinstateButton({ userId, name }: { userId: number; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function submit() {
    setBusy(true);
    try {
      await unwrapAction(reinstateUser(userId, note.trim() || undefined));
    } catch (err) {
      setBusy(false);
      toast.error(
        err instanceof Error ? err.message : "Could not reinstate the account",
      );
      return;
    }
    setBusy(false);
    setOpen(false);
    setNote("");
    toast.success(`${name} is active again.`);
    router.refresh();
  }

  return (
    <>
      <AdminButton onPress={() => setOpen(true)}>
        <RotateCcw aria-hidden />
        Reinstate
      </AdminButton>
      <Overlay
        isOpen={open}
        onOpenChange={setOpen}
        isBusy={busy}
        title={`Reinstate ${name}`}
        description="Every verdict still holding this account is reversed, and the member is told."
        footer={
          <>
            <AdminButton tone="plain" onPress={() => setOpen(false)} isDisabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton tone="primary" onPress={submit} isLoading={busy}>
              Reinstate account
            </AdminButton>
          </>
        }
      >
        <div className="pb-2">
          <AdminTextArea
            label="Note to the member (optional)"
            value={note}
            onChange={setNote}
            rows={3}
          />
        </div>
      </Overlay>
    </>
  );
}
