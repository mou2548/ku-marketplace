import Link from "next/link";
import { ArrowLeftRight, Download, QrCode, ImageIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function QrCodePage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-page-background p-6">
      <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-3xl border border-border bg-white p-6 shadow-elevated">
        {/* Title */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.32px] text-primary-dark">
            สแกนเพื่อยืนยันการมอบของ
          </h1>
          <p className="max-w-[400px] text-base text-muted-foreground">
            ให้ผู้ขอแลกแสกนคิวอาร์โค้ดนี้เมื่อมาถึงจุดนัดพบเพื่อจบการแลกเปลี่ยน
          </p>
        </div>

        {/* QR code */}
        {/* TODO: this is a placeholder glyph, not a scannable code — the real
            generator lives in components/qr-waiting-card.tsx */}
        <div className="flex size-[360px] items-center justify-center rounded-2xl border border-primary-dark/20 bg-white p-6 shadow-card">
          <div className="grid size-full place-items-center rounded-lg bg-surface-muted">
            <QrCode className="size-32 text-muted-foreground/40" />
          </div>
        </div>

        {/* Status badge */}
        <span className="flex items-center gap-2 rounded-full bg-surface-muted px-4 py-2">
          <span className="size-2.5 animate-pulse rounded-full bg-warning-dark" />
          <span className="text-sm font-medium tracking-[0.14px] text-muted-foreground">
            Waiting to scan
          </span>
        </span>

        {/* Locked agreement summary */}
        <div className="flex w-full flex-col gap-4 rounded-xl border border-border/30 bg-white p-4 shadow-card">
          <h3 className="border-b border-border/20 pb-2 text-sm font-medium tracking-[0.14px] text-foreground">
            Locked Agreement Summary
          </h3>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Owner&apos;s Item
              </span>
              <div className="grid size-16 place-items-center rounded-lg border border-border/20 bg-surface-muted">
                <ImageIcon className="size-6 text-muted-foreground/40" />
              </div>
              <span className="text-center text-xs font-medium text-foreground">
                Calculus Textbook
              </span>
            </div>

            <ArrowLeftRight className="size-5 shrink-0 text-primary-dark" />

            <div className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Requester&apos;s Item
              </span>
              <div className="grid size-16 place-items-center rounded-lg border border-border/20 bg-surface-muted">
                <ImageIcon className="size-6 text-muted-foreground/40" />
              </div>
              <span className="text-center text-xs font-medium text-foreground">
                Casio Calculator
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex w-full gap-4">
          {/* TODO: inert — downloading needs the generated data URL, which only
              the client-side generator has. See qr-waiting-card.tsx. */}
          <Button
            disabled
            className="h-12 flex-1 gap-2 text-sm font-medium tracking-[0.14px]"
          >
            <Download className="size-4" />
            บันทึก QR Code
          </Button>
          <Link
            href="/chat"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-12 flex-1 bg-white text-sm font-medium tracking-[0.14px]"
            )}
          >
            ยกเลิก
          </Link>
        </div>
      </div>
    </div>
  );
}
