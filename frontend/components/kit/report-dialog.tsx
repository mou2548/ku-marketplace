"use client";

import { useState } from "react";
import { getCopy } from "@/lib/copy";
import { CircleCheck, Flag, Info } from "lucide-react";

import { createReport } from "@/lib/actions/reports";
import { uploadFile } from "@/lib/actions/uploads";
import type { ApiError } from "@/lib/api/client";
import type { ChatMessage } from "@/lib/api/types";
import { isReportDetailsValid, REPORT_DETAILS_MIN } from "@/lib/report-rules";

import { Button } from "./button";
import { ChatMessagePicker } from "./chat-message-picker";
import { Radio, RadioGroupField } from "./choice";
import { EvidencePicker } from "./evidence-picker";
import { TextAreaField } from "./field";
import { Overlay, OverlayTrigger } from "./overlay";

/**
 * §7.5.1/§7.5.2 — the two report types that, unlike a transaction, have no
 * full-page flow of their own (`/history/[txId]/report`'s `ReportForm` stays
 * separate: it also shows deal context and gates on a flow deadline, neither
 * of which applies here). One small dialog, opened wherever a post or a
 * person actually shows up — the post's own action bar, a chat counterparty.
 */

/**
 * What counts as evidence and when it can be added, said before the pickers.
 * A report cannot be added to once it is sent, which is the part people miss.
 */
export function EvidenceNote({ canPickMessages }: { canPickMessages: boolean }) {
  return (
    <div className="flex gap-2.5 rounded-control bg-tone-info-bg p-3 text-caption leading-[1.6] text-tone-info-fg">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Evidence helps an admin decide faster</p>
        <p>
          Photos: screenshots or pictures of what happened, up to 5, each 5MB
          or smaller (JPEG, PNG or WEBP).
          {canPickMessages
            ? " Chat messages: tick the exact messages the report is about."
            : " To point at chat messages, report from the chat with this person instead."}
        </p>
        <p className="font-medium">
          Add everything now. Evidence cannot be added after the report is sent.
        </p>
      </div>
    </div>
  );
}

/** The chat a report is filed from, when there is one to pick messages from. */
export interface ReportChat {
  messages: ChatMessage[];
  viewerId: number;
}

export interface ReportReasonOption {
  id: string;
  label: string;
  description?: string;
}

export function ReportDialog({
  reportType,
  targetId,
  reasons,
  trigger,
  chat,
}: {
  reportType: "Post" | "User";
  targetId: number;
  reasons: ReportReasonOption[];
  trigger: React.ReactNode;
  /** Only a report started inside a deal chat can pick its messages. */
  chat?: ReportChat;
}) {
  const t = getCopy("reportDialog");
  const [reason, setReason] = useState(reasons[0]?.id ?? "");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [messageIds, setMessageIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const evidence_urls: string[] = [];
      for (const photo of photos) evidence_urls.push(await uploadFile(photo));
      const label = reasons.find((r) => r.id === reason)?.label ?? reason;
      await createReport({
        report_type: reportType,
        target_id: targetId,
        reason_category: label,
        details: details.trim(),
        evidence_urls: evidence_urls.length ? evidence_urls : undefined,
        evidence_message_ids: messageIds.length ? messageIds : undefined,
      });
      setSubmitted(true);
    } catch (e) {
      setError((e as ApiError).message ?? t("error"));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setReason(reasons[0]?.id ?? "");
    setDetails("");
    setPhotos([]);
    setMessageIds([]);
    setSubmitted(false);
    setError(undefined);
  }

  return (
    <OverlayTrigger onOpenChange={(open) => !open && reset()}>
      {trigger}
      <Overlay
        isBusy={busy}
        title={t(reportType === "Post" ? "postTitle" : "userTitle")}
        description={
          submitted
            ? undefined
            : t("description")
        }
        footer={
          submitted ? (
            <Button slot="close">{t("close")}</Button>
          ) : (
            <>
              <Button variant="ghost" slot="close">
                {t("cancel")}
              </Button>
              <Button
                variant="danger"
                isDisabled={!reason || !isReportDetailsValid(details)}
                isLoading={busy}
                onPress={submit}
              >
                <Flag className="size-4" />
                {t("submit")}
              </Button>
            </>
          )
        }
      >
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid size-11 place-items-center rounded-pill bg-tone-success-bg text-tone-success-fg">
              <CircleCheck aria-hidden className="size-5" />
            </span>
            <p className="text-body text-ink-secondary">
              {t("submitted")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <RadioGroupField label={t("reason")} value={reason} onChange={setReason} variant="card">
              {reasons.map((r) => (
                <Radio key={r.id} value={r.id} description={r.description}>
                  {r.label}
                </Radio>
              ))}
            </RadioGroupField>

            <TextAreaField
              label={t("details")}
              value={details}
              onChange={setDetails}
              rows={4}
              placeholder={t("placeholder")}
              hint={t("hint", { min: REPORT_DETAILS_MIN })}
              isRequired
              errorMessage={error}
            />

            <EvidenceNote canPickMessages={!!chat} />
            {chat ? (
              <ChatMessagePicker
                messages={chat.messages}
                viewerId={chat.viewerId}
                selected={messageIds}
                onChange={setMessageIds}
              />
            ) : null}
            <EvidencePicker
              files={photos}
              onChange={setPhotos}
              label="Photos"
            />
          </div>
        )}
      </Overlay>
    </OverlayTrigger>
  );
}
