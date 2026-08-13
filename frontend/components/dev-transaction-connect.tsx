"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDevToken, setDevToken } from "@/lib/dev-token";

/**
 * Chat & appointment-card endpoints require a real JWT (JwtAuthGuard) and a
 * real numeric transaction_id — there's no login flow wired up yet, so this
 * lets both be pasted in manually to test against the live API instead of
 * the local mock conversations.
 */
export function DevTransactionConnect({
  onConnect,
}: {
  onConnect: (transactionId: number) => void;
}) {
  const [token, setToken] = useState(() => getDevToken() ?? "");
  const [transactionIdInput, setTransactionIdInput] = useState("");

  const parsedId = Number(transactionIdInput);
  const isValid = Number.isInteger(parsedId) && parsedId > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/10 bg-surface-muted/50 px-4 py-2">
      <span className="text-[11px] font-bold tracking-[0.5px] text-muted-foreground uppercase">
        Dev: เชื่อม transaction จริง
      </span>
      <Input
        type="text"
        value={token}
        onChange={(event) => {
          setToken(event.target.value);
          setDevToken(event.target.value);
        }}
        placeholder="Access token (Bearer ...)"
        className="h-8 w-56 rounded-lg text-xs"
      />
      <Input
        type="number"
        min={1}
        value={transactionIdInput}
        onChange={(event) => setTransactionIdInput(event.target.value)}
        placeholder="Transaction ID"
        className="h-8 w-32 rounded-lg text-xs"
      />
      <Button
        size="sm"
        className="h-8"
        disabled={!isValid}
        onClick={() => onConnect(parsedId)}
      >
        Connect
      </Button>
    </div>
  );
}
