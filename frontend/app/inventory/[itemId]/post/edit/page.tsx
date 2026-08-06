import Link from "next/link";
import { notFound } from "next/navigation";

import { EditPostForm } from "@/components/edit-post-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { getItem, isItemLocked } from "@/lib/items";
import { getPostByItemId } from "@/lib/posts";

/**
 * §2.3.2 — the listed half of item management: price and terms editable,
 * item details locked, post withdrawable back to Unlisted.
 */
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const item = getItem(itemId);

  if (!item) notFound();

  const post = getPostByItemId(item.id);
  // A live trade freezes the post too — the buyer agreed to these terms.
  const editable = post !== undefined && !isItemLocked(item);

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        {editable ? (
          <EditPostForm
            itemId={item.id}
            itemName={item.name}
            mode={post.mode}
            initialPrice={post.price}
            initialWants={post.wants}
          />
        ) : (
          <Card className="flex-col gap-3 rounded-3xl p-6 text-center shadow-card ring-0">
            <h1 className="text-lg font-semibold text-foreground">
              จัดการโพสต์ไม่ได้
            </h1>
            <p className="text-sm text-muted-foreground">
              {isItemLocked(item)
                ? "สินค้าอยู่ระหว่างธุรกรรม เงื่อนไขของโพสต์ถูกล็อกไว้จนกว่าธุรกรรมจะจบ"
                : "สินค้าชิ้นนี้ยังไม่มีโพสต์ที่เปิดอยู่"}
            </p>
            {!isItemLocked(item) && item.status === "unlisted" && (
              <Link
                href={`/inventory/${item.id}/post`}
                className="text-sm font-medium text-primary-dark underline underline-offset-2"
              >
                สร้างโพสต์ใหม่
              </Link>
            )}
            <Link
              href="/inventory"
              className="text-sm text-muted-foreground underline underline-offset-2"
            >
              กลับไปคลังสินค้า
            </Link>
          </Card>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
