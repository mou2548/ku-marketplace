"use server";

import { runAction, type ActionResult } from "@/lib/action-result";
import { getAccessToken } from "@/lib/api/session";
import { createItem, deleteItem, updateItem, type ItemPayload } from "@/lib/api/items";
import type { Item } from "@/lib/api/types";

/**
 * Plain async actions, not the `useActionState` shape — `item-form.tsx`
 * already manages its own busy/toast state around a single `save()` call
 * (same pattern as `lib/actions/account.ts`), so these are called directly.
 */
export async function saveNewItem(payload: ItemPayload): Promise<ActionResult<Item>> {
  return runAction(async () => {
    if (!(await getAccessToken())) {
      throw new Error("Not signed in");
    }
    return createItem(payload);
  });
}

export async function saveItemEdits(itemId: number, payload: Partial<ItemPayload>): Promise<ActionResult<Item>> {
  return runAction(async () => {
    if (!(await getAccessToken())) {
      throw new Error("Not signed in");
    }
    return updateItem(itemId, payload);
  });
}

export async function removeItem(itemId: number): Promise<ActionResult<void>> {
  return runAction(async () => {
    if (!(await getAccessToken())) {
      throw new Error("Not signed in");
    }
    await deleteItem(itemId);
  });
}
