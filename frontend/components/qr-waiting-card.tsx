"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Deterministic fake QR pattern — no real QR-generation library wired
// (no real data to encode for a mock trade), and Math.random() would
// cause an SSR/client hydration mismatch, so this hashes cell coords instead.
const QR_SIZE = 21;
const FINDER_SIZE = 7;

function isFinderPattern(row: number, col: number) {
  const inCorner = (r: number, c: number) =>
    row >= r && row < r + FINDER_SIZE && col >= c && col < c + FINDER_SIZE;
  return (
    inCorner(0, 0) ||
    inCorner(0, QR_SIZE - FINDER_SIZE) ||
    inCorner(QR_SIZE - FINDER_SIZE, 0)
  );
}

function isFinderRing(localRow: number, localCol: number) {
  const isOuterRing =
    localRow === 0 ||
    localRow === FINDER_SIZE - 1 ||
    localCol === 0 ||
    localCol === FINDER_SIZE - 1;
  const isInnerSquare =
    localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
  return isOuterRing || isInnerSquare;
}

function qrCellFilled(row: number, col: number) {
  if (isFinderPattern(row, col)) {
    const localRow = row < FINDER_SIZE ? row : row - (QR_SIZE - FINDER_SIZE);
    const localCol = col < FINDER_SIZE ? col : col - (QR_SIZE - FINDER_SIZE);
    return isFinderRing(localRow, localCol);
  }
  return (row * 31 + col * 17 + row * col * 7) % 5 === 0;
}

const QR_CELLS = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
  const row = Math.floor(i / QR_SIZE);
  const col = i % QR_SIZE;
  return qrCellFilled(row, col);
});

export function QrWaitingCard() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/trade/success");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-elevated">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-center text-[32px] leading-10 font-semibold tracking-[-0.32px] text-[#2E8F5A]">
          สแกนเพื่อยืนยันการมอบของ
        </h1>
        <p className="max-w-[400px] text-center text-base text-muted-foreground">
          ให้ผู้ขอแลกสแกนคิวอาร์โค้ดนี้เมื่อมาถึงจุดนัดพบเพื่อจบการแลกเปลี่ยน
        </p>
      </div>

      <div className="relative flex size-[300px] items-center justify-center rounded-3xl border border-border/30 p-6 shadow-card sm:size-[460px]">
        <div className="pointer-events-none absolute inset-px animate-pulse rounded-3xl border-4 border-[#006633]/30" />
        <div
          className="grid aspect-square w-full max-w-[410px] gap-px rounded-lg bg-[#E2E7FF] p-2"
          style={{ gridTemplateColumns: `repeat(${QR_SIZE}, 1fr)` }}
        >
          {QR_CELLS.map((filled, i) => (
            <div
              key={i}
              className={filled ? "bg-foreground" : "bg-transparent"}
            />
          ))}
        </div>
      </div>

      <Badge className="h-auto gap-2 bg-[#E2E7FF] px-4 py-2 text-sm font-medium tracking-[0.14px] text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin text-[#7C5800]" />
        รอการสแกน...
      </Badge>

      <div className="flex w-full gap-4 pt-4">
        <Button className="h-12 flex-1 gap-2 text-sm font-medium tracking-[0.14px]">
          <Download className="size-4" />
          บันทึกรูปภาพ
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/chat")}
          className="h-12 flex-1 bg-[#FAF8FF] text-sm font-medium tracking-[0.14px]"
        >
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}
