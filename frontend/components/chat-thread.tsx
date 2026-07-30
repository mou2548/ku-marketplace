"use client";

import { useState } from "react";
import Link from "next/link";
import {
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Thread {
  name: string;
  status: string;
  item: { name: string };
  meetupLocation: string;
  meetupSubtitle: string;
}

export function ChatThread({ thread }: { thread: Thread }) {
  const [cancelled, setCancelled] = useState(false);

  return (
    <main className="flex flex-1 flex-col bg-[#F8FAFC]">
      <div className="flex items-center justify-between border-b border-border/20 bg-[#FAF8FF] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="size-10 animate-pulse rounded-full bg-[#DAE2FD]" />
          <div className="flex flex-col">
            <span className="text-lg font-normal text-foreground">
              {thread.name}
            </span>
            <span className="text-sm font-medium text-[#10B981]">
              {thread.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Call"
            className="size-10 text-muted-foreground hover:bg-[#F2F3FF]"
          >
            <Phone className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="More options"
            className="size-10 text-muted-foreground hover:bg-[#F2F3FF]"
          >
            <MoreVertical className="size-[18px]" />
          </Button>
        </div>
      </div>

      <div className="border-b border-border/10 bg-[#FAF8FF] p-6 shadow-card">
        <div className="flex flex-col gap-4 rounded-3xl border border-border/20 bg-[#FAF8FF] p-6">
          <h3 className="text-[13px] font-bold tracking-[1.3px] text-muted-foreground uppercase">
            รายการแจกฟรี (Free Item)
          </h3>
          <div className="flex flex-col gap-4 rounded-xl border border-border/20 bg-white p-4 shadow-card">
            <div className="flex items-center gap-4">
              <div className="size-14 shrink-0 animate-pulse rounded-lg border border-border/10 bg-[#DAE2FD]" />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold tracking-[0.55px] text-muted-foreground uppercase">
                  Item for Giveaway
                </span>
                <span className="text-base text-foreground">
                  {thread.item.name}
                </span>
              </div>
            </div>
            {cancelled ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-[#F4F6F8] py-3 text-sm font-bold text-[#6F7A6F]">
                <XCircle className="size-4" />
                Request Cancelled
              </div>
            ) : (
              <div className="flex gap-4">
                <Link
                  href="/trade/qr"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#2E8F5A] text-sm font-bold text-white shadow-card hover:bg-[#2E8F5A]/90"
                >
                  <QrCode className="size-4" />
                  สแกน QR Code เพื่อรับของ
                </Link>
                <CancelRequestDialog
                  itemName={thread.item.name}
                  onConfirm={() => setCancelled(true)}
                  triggerClassName="h-11 flex-1 rounded-full border border-[#BA1A1A] text-sm font-bold text-[#BA1A1A] hover:bg-[#BA1A1A]/5"
                >
                  Cancel
                </CancelRequestDialog>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-y-auto p-6">
        {cancelled ? (
          <Badge className="h-auto gap-2 border-border/20 bg-[#FAF8FF] px-5 py-2 text-sm text-muted-foreground shadow-card">
            <XCircle className="size-3.5" />
            You cancelled this request
          </Badge>
        ) : (
          <div className="flex w-full max-w-[320px] flex-col gap-3 rounded-2xl bg-[#2E8F5A] p-3 shadow-card">
            <div className="overflow-hidden rounded-xl bg-[#FAF8FF]">
              <div className="relative h-36 w-full bg-[#DAE2FD]">
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#BA1A1A] opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-[#BA1A1A]" />
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
                <div className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
                  <MapPin className="size-4 text-[#2E8F5A]" />
                </div>
              </div>

              <Button
                variant="ghost"
                className="h-auto w-full justify-between rounded-none border-t border-border/10 px-3 py-2.5 text-[13px] font-semibold text-[#2E8F5A] hover:bg-[#F2F3FF]/50"
              >
                View on Map
                <ExternalLink className="size-3" />
              </Button>
              <Button
                variant="ghost"
                className="h-auto w-full justify-center gap-2 rounded-t-none rounded-b-xl border-t border-border/10 bg-[#F2F3FF] px-3 py-2.5 text-[13px] font-semibold text-[#2E8F5A] hover:bg-[#F2F3FF]/70"
              >
                <LocateFixed className="size-4" />
                Share My Location
              </Button>
            </div>

            <p className="text-center text-base text-white">
              Meeting at {thread.meetupLocation}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border/10 bg-[#FAF8FF] p-6">
        <div className="mx-auto flex w-full max-w-[832px] items-center gap-4 rounded-xl border border-border/20 bg-[#F2F3FF] p-2 shadow-card">
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
            className="h-10 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-base text-foreground placeholder:text-[#6B7280] focus-visible:ring-0"
          />
          <Button
            size="icon"
            aria-label="Send message"
            className="size-10 shrink-0 shadow-card"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </main>
  );
}
