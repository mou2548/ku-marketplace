import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CreatePostForm } from "@/components/create-post-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import {
  ITEM_CONDITION_LABELS,
  ITEM_STATUS_LABELS,
  getItem,
  isItemLocked,
} from "@/lib/items";
import { getPostByItemId } from "@/lib/posts";

/**
 * §3.1 — create a post for an item already in the inventory.
 *
 * Guarded on three things the proposal is explicit about: the item must be
 * yours, it must not be frozen by a live trade (§2.3), and a transferred item
 * can never be listed again (§2.3.3).
 */
export default async function CreatePostPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const item = getItem(itemId);

  if (!item) notFound();

  const existingPost = getPostByItemId(item.id);
  const blockedReason = isItemLocked(item)
    ? "สินค้าชิ้นนี้ถูกล็อกอยู่เพราะมีธุรกรรมกำลังดำเนินอยู่"
    : item.status === "transferred"
      ? "สินค้าชิ้นนี้โอนเจ้าของไปแล้ว หากต้องการขายต่อให้สร้างรายการสินค้าใหม่"
      : existingPost
        ? "สินค้าชิ้นนี้มีโพสต์ที่เปิดอยู่แล้ว ถอนโพสต์เดิมก่อนจึงจะประกาศใหม่ได้"
        : null;

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        <Card className="flex-row items-center gap-4 rounded-3xl p-5 shadow-card ring-0">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border/30 bg-surface-muted">
            <Image
              src={item.images[0]}
              alt={item.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-lg font-semibold text-foreground">
              {item.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {item.category} • {ITEM_CONDITION_LABELS[item.condition].th} •{" "}
              {ITEM_STATUS_LABELS[item.status].th}
            </p>
          </div>
        </Card>

        {blockedReason ? (
          <Card className="flex-col gap-3 rounded-3xl p-6 text-center shadow-card ring-0">
            <h2 className="text-lg font-semibold text-foreground">
              ประกาศขายไม่ได้
            </h2>
            <p className="text-sm text-muted-foreground">{blockedReason}</p>
            <Link
              href="/inventory"
              className="text-sm font-medium text-primary-dark underline underline-offset-2"
            >
              กลับไปคลังสินค้า
            </Link>
          </Card>
        ) : (
          <CreatePostForm itemId={item.id} itemName={item.name} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
