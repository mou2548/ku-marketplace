"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  LocateFixed,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  QrCode,
  Send,
  XCircle,
} from "lucide-react";

import { CancelRequestDialog } from "@/components/cancel-request-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/chat-threads";

type Thread = Conversation["thread"];

export function ChatThread({
  thread,
  onBack,
  className,
}: {
  thread: Thread;
  /** Mobile only — the inbox is hidden below md, so the thread needs its own way out. */
  onBack?: () => void;
  className?: string;
}) {
  const [cancelled, setCancelled] = useState(false);
  const isGiveaway = thread.kind === "giveaway";

  return (
    <main className={cn("min-w-0 flex-1 flex-col bg-white", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/20 px-4 py-3 md:px-6 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to inbox"
              onClick={onBack}
              className="size-9 shrink-0 md:hidden"
            >
              <ArrowLeft className="size-5" />
            </Button>
          )}
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-primary-light text-sm font-semibold text-primary-dark">
              {thread.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-lg font-normal text-foreground">
              {thread.name}
            </span>
            <span className="truncate text-sm font-medium text-primary">
              {thread.status}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Call"
            className="size-10 text-muted-foreground hover:bg-surface-muted"
          >
            <Phone className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="More options"
            className="size-10 text-muted-foreground hover:bg-surface-muted"
          >
            <MoreVertical className="size-[18px]" />
          </Button>
        </div>
      </div>

      {/* Claim card is giveaway-only — a paid negotiation has nothing to claim. */}
      {isGiveaway && (
        <div className="shrink-0 border-b border-border/10 p-4 md:p-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-border/20 bg-page-background p-4 md:p-6">
            <h3 className="text-[13px] font-bold tracking-[1.3px] text-muted-foreground uppercase">
              รายการแจกฟรี (Free Item)
            </h3>
            <div className="flex flex-col gap-4 rounded-xl border border-border/20 bg-white p-4 shadow-card">
              <div className="flex items-center gap-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border/10 bg-surface-muted">
                  <Image
                    src={thread.item.image}
                    alt={thread.item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.55px] text-muted-foreground uppercase">
                    Item for Giveaway
                  </span>
                  <span className="truncate text-base text-foreground">
                    {thread.item.name}
                  </span>
                </div>
              </div>
              {cancelled ? (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-muted py-3 text-sm font-bold text-muted-foreground">
                  <XCircle className="size-4" />
                  Request Cancelled
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Link
                    href={`/trade/${thread.tradeId}/qr`}
                    className={cn(
                      buttonVariants(),
                      "h-11 w-full gap-2 text-sm font-bold whitespace-nowrap shadow-card sm:flex-1"
                    )}
                  >
                    <QrCode className="size-4" />
                    สแกน QR Code เพื่อรับของ
                  </Link>
                  <CancelRequestDialog
                    itemName={thread.item.name}
                    onConfirm={() => setCancelled(true)}
                    triggerClassName={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-11 w-full border-error text-sm font-bold text-error hover:bg-error/5 sm:flex-1"
                    )}
                  >
                    Cancel
                  </CancelRequestDialog>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-6">
        {thread.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex flex-col gap-1",
              message.from === "me" ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-card sm:max-w-[70%]",
                message.from === "me"
                  ? "rounded-br-sm bg-primary text-white"
                  : "rounded-bl-sm bg-surface-muted text-foreground"
              )}
            >
              {message.text}
            </div>
            <span className="px-1 text-[11px] text-muted-foreground">
              {message.time}
            </span>
          </div>
        ))}

        {cancelled && (
          <Badge className="mx-auto h-auto gap-2 border-border/20 bg-surface-muted px-5 py-2 text-sm text-muted-foreground">
            <XCircle className="size-3.5" />
            You cancelled this request
          </Badge>
        )}

        {/* Meetup card is a message in the thread, not a floating panel — and only
            exists once a spot has actually been agreed. */}
        {thread.meetupLocation && !cancelled && (
          <div className="flex w-full max-w-[320px] flex-col gap-3 self-center rounded-2xl bg-primary p-3 shadow-card">
            <div className="overflow-hidden rounded-xl bg-white">
              <div className="relative h-36 w-full bg-surface-muted">
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-error opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-error" />
                  </span>
                  <span className="text-[10px] font-bold tracking-[1px] text-white uppercase">
                    Live Tracking
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 flex flex-col gap-0.5">
                  <span className="text-base font-semibold text-white">
                    {thread.meetupLocation}
                  </span>
                  <span className="text-xs text-white/90">
                    {thread.meetupSubtitle}
                  </span>
                </div>
                <div className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-card">
                  <MapPin className="size-4 text-primary" />
                </div>
              </div>

              <Button
                variant="ghost"
                className="h-auto w-full justify-between rounded-none border-t border-border/10 px-3 py-2.5 text-[13px] font-semibold text-primary-dark hover:bg-surface-muted"
              >
                View on Map
                <ExternalLink className="size-3" />
              </Button>
              <Link
                href={`/chat/${thread.tradeId}/target`}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-auto w-full justify-center gap-2 rounded-t-none rounded-b-xl border-t border-border/10 bg-surface-muted px-3 py-2.5 text-[13px] font-semibold text-primary-dark hover:bg-surface-muted/70"
                )}
              >
                <LocateFixed className="size-4" />
                Share My Location
              </Link>
            </div>

            <p className="text-center text-sm text-white">
              Meeting at {thread.meetupLocation}
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/10 p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-[832px] items-center gap-3 rounded-xl border border-border/20 bg-surface-muted p-2 shadow-card">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Attach"
            className="size-10 shrink-0 text-muted-foreground hover:bg-white/50"
          >
            <Plus className="size-5" />
          </Button>
          <Input
            type="text"
            placeholder="Type a message..."
            className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
          />
          <Button size="icon" aria-label="Send message" className="size-10 shrink-0 shadow-card">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
