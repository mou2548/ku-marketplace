"use client";

import { useRouter } from "next/navigation";

/** A URL-driven select keeps category, search and listing type when sorting. */
export function SellerFilterSelect({
  pathname,
  query,
  name,
  value,
  label,
  options,
  className,
}: {
  pathname: string;
  query: string;
  name: "sort" | "category";
  value: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  return (
    <select
      aria-label={label}
      value={value}
      className={className}
      onChange={(event) => {
        const next = new URLSearchParams(query);
        next.delete("page");
        if (event.target.value) next.set(name, event.target.value);
        else next.delete(name);
        router.push(`${pathname}?${next}`, { scroll: false });
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
