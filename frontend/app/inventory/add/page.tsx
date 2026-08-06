import { ImageIcon } from "lucide-react";

import { AddItemForm } from "@/components/add-item-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";

export default function AddItemPage() {
  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-8 p-6 lg:grid-cols-12 lg:p-10">
        <div className="lg:col-span-5">
          <AddItemForm />
        </div>

        <div className="flex flex-col items-center justify-start pt-2 lg:col-span-7 lg:pt-6">
          <div className="flex w-full max-w-md flex-col gap-4">
            <h2 className="text-base font-bold text-foreground">ตัวอย่างการ์ดสินค้า</h2>

            <Card className="flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-card ring-0">
              <div className="flex aspect-[4/3.8] w-full items-center justify-center bg-surface-muted text-muted-foreground/40">
                <ImageIcon className="size-16 stroke-[1.25]" />
              </div>

              <div className="flex flex-col gap-2.5 p-5">
                <div className="h-4 w-3/5 animate-pulse rounded-md bg-surface-muted" />
                <div className="h-3 w-1/5 animate-pulse rounded-md bg-surface-muted" />
                <div className="mb-2 h-3 w-2/5 animate-pulse rounded-md bg-surface-muted" />
                <div className="flex items-center gap-2 pt-1">
                  <div className="size-6 animate-pulse rounded-full bg-surface-muted" />
                  <div className="h-3 w-16 animate-pulse rounded-md bg-surface-muted" />
                </div>
              </div>
            </Card>

            {/* §2.1 — the card the marketplace shows comes from the post, not
                the item, so this preview stops at the item's own fields. */}
            <p className="mt-1 text-center text-[11px] text-muted-foreground">
              สินค้าจะเข้าคลังในสถานะ Unlisted ก่อน
              แล้วค่อยเลือกประกาศขายหรือแลกเปลี่ยนทีหลัง
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
