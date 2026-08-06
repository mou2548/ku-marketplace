"use client";

import { useState } from "react";

import { SuccessDialog } from "@/components/success-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { giveawaysApi } from "@/lib/giveaways-api";

export function GiveawayJoinAction({
  giveawayId,
  itemName,
  triggerClassName,
  children,
}: {
  giveawayId: string;
  itemName: string;
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const [receiverId, setReceiverId] = useState("");
  const parsedReceiverId = Number(receiverId);
  const isReceiverIdValid = Number.isInteger(parsedReceiverId) && parsedReceiverId > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor={`receiver-id-${giveawayId}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Receiver ID (ตาม API proposal)
        </Label>
        <Input
          id={`receiver-id-${giveawayId}`}
          type="number"
          min={1}
          value={receiverId}
          onChange={(event) => setReceiverId(event.target.value)}
          placeholder="เช่น 3 (user_id ของผู้รับ)"
          className="h-10 rounded-xl"
        />
      </div>

      <SuccessDialog
        triggerClassName={triggerClassName}
        itemName={itemName}
        disabled={!isReceiverIdValid}
        onConfirm={() => giveawaysApi.join(giveawayId, parsedReceiverId).then(() => {})}
      >
        {children}
      </SuccessDialog>
    </div>
  );
}
