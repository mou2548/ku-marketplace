import Link from "next/link";
import { notFound } from "next/navigation";

import { AddItemForm } from "@/components/add-item-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { canEditItemDetails, getItem, isItemLocked } from "@/lib/items";

/**
 * §2.3.1 — an unlisted item is fully editable by its owner.
 *
 * The two refusals below are the other half of §2.3: a listed item has its
 * details locked (only its post's price and terms may change, see
 * /inventory/[id]/post/edit), and anything bound to a live trade is frozen
 * outright regardless of status.
 */
export default async function EditItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const item = getItem(itemId);

  if (!item) notFound();

  const editable = canEditItemDetails(item);

  return (
    <div className="flex min-h-full flex-col bg-page-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-6 py-8">
        {editable ? (
          <AddItemForm
            mode="edit"
            defaults={{
              name: item.name,
              category: item.category,
              condition: item.condition,
              description: item.description ?? "",
              existingPhotoCount: item.images.length,
              subjectName: item.categoryFields?.subjectName ?? "",
              brandModel: item.categoryFields?.brandModel ?? "",
              hasWarranty: item.categoryFields?.warranty?.covered ?? false,
              warrantyExpiry: item.categoryFields?.warranty?.expiresAt ?? "",
              size: item.categoryFields?.size ?? "",
            }}
          />
        ) : (
          <Card className="flex-col gap-3 rounded-3xl p-6 text-center shadow-card ring-0">
            <h1 className="text-lg font-semibold text-foreground">
              แก้ไขสินค้าชิ้นนี้ไม่ได้
            </h1>
            <p className="text-sm text-muted-foreground">
              {isItemLocked(item)
                ? "สินค้าถูกล็อกอยู่เพราะมีธุรกรรมกำลังดำเนินอยู่ แก้ไขได้เมื่อธุรกรรมจบลง"
                : item.status === "listed"
                  ? "สินค้าประกาศขายอยู่ ข้อมูลตัวสินค้าถูกล็อก แก้ได้เฉพาะราคาและเงื่อนไขแลกเปลี่ยนในโพสต์ หรือถอนโพสต์ก่อนจึงจะแก้ข้อมูลสินค้าได้"
                  : "สินค้าโอนเจ้าของไปแล้ว เป็นสถานะสิ้นสุดที่แก้ไขไม่ได้"}
            </p>
            {item.status === "listed" && !isItemLocked(item) && (
              <Link
                href={`/inventory/${item.id}/post/edit`}
                className="text-sm font-medium text-primary-dark underline underline-offset-2"
              >
                ไปหน้าจัดการโพสต์
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
