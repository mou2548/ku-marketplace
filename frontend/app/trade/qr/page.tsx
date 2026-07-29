import Link from "next/link";
import { ArrowLeftRight, Download, QrCode, ImageIcon } from "lucide-react";

export default function QrCodePage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-ku-surface p-6">
      <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        {/* Title */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-kanit text-3xl font-semibold tracking-[-0.32px] text-ku-green">
            สแกนเพื่อยืนยันการมอบของ
          </h1>
          <p className="max-w-[400px] font-prompt text-base text-ku-muted">
            ให้ผู้ขอแลกแสกนคิวอาร์โค้ดนี้เมื่อมาถึงจุดนัดพบเพื่อจบการแลกเปลี่ยน
          </p>
        </div>

        {/* QR code */}
        <div className="flex size-[360px] items-center justify-center rounded-2xl border border-ku-green-accent bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="grid size-full place-items-center rounded-lg bg-ku-periwinkle">
            <QrCode className="size-32 text-[rgba(19,27,46,0.35)]" />
          </div>
        </div>

        {/* Status badge */}
        <span className="flex items-center gap-2 rounded-full bg-ku-periwinkle px-4 py-2">
          <span className="size-2.5 animate-pulse rounded-full bg-[#7C5800]" />
          <span className="font-prompt text-sm font-medium tracking-[0.14px] text-ku-muted">
            Waiting to scan
          </span>
        </span>

        {/* Locked agreement summary */}
        <div className="flex w-full flex-col gap-4 rounded-xl border border-[rgba(191,201,189,0.3)] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <h3 className="border-b border-[rgba(191,201,189,0.2)] pb-2 font-prompt text-sm font-medium tracking-[0.14px] text-ku-ink">
            Locked Agreement Summary
          </h3>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 flex-col items-center gap-2">
              <span className="font-prompt text-xs font-medium text-ku-muted">
                Owner&apos;s Item
              </span>
              <div className="grid size-16 place-items-center rounded-lg border border-[rgba(191,201,189,0.2)] bg-ku-lilac">
                <ImageIcon className="size-6 text-[rgba(19,27,46,0.2)]" />
              </div>
              <span className="text-center font-prompt text-xs font-medium text-ku-ink">
                Calculus Textbook
              </span>
            </div>

            <ArrowLeftRight className="size-5 shrink-0 text-ku-green-accent" />

            <div className="flex flex-1 flex-col items-center gap-2">
              <span className="font-prompt text-xs font-medium text-ku-muted">
                Requester&apos;s Item
              </span>
              <div className="grid size-16 place-items-center rounded-lg border border-[rgba(191,201,189,0.2)] bg-ku-lilac">
                <ImageIcon className="size-6 text-[rgba(19,27,46,0.2)]" />
              </div>
              <span className="text-center font-prompt text-xs font-medium text-ku-ink">
                Casio Calculator
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex w-full gap-4">
          <button className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ku-green-accent font-prompt text-sm font-medium tracking-[0.14px] text-white hover:brightness-95">
            <Download className="size-4" />
            บันทึก QR Code
          </button>
          <Link
            href="/chat"
            className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-[#BFC9BD] bg-ku-surface font-prompt text-sm font-medium tracking-[0.14px] text-ku-ink hover:bg-ku-lilac"
          >
            ยกเลิก
          </Link>
        </div>
      </div>
    </div>
  );
}
