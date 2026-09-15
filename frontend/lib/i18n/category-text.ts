"use client";

import { useTranslations } from "next-intl";

import { categoryLabelKey } from "@/lib/categories";

/**
 * Turns a stored category name into the words on screen.
 *
 * Mirrors `useStatusText`: exactly one hook knows the `category.` prefix. The
 * fallback matters more here than it does for statuses — `ItemCategory` is an
 * open string (`GET /items/categories` decides the real list at runtime), so an
 * unknown category has to render its own name rather than throw or print a key.
 */
export function useCategoryLabel() {
  const t = useTranslations("category");

  return (category: string) => {
    const key = categoryLabelKey(category);
    return key ? t(key) : category;
  };
}
