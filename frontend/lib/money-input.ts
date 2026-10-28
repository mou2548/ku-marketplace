/**
 * Reading a typed baht amount (audit T03). The extra-cash field used to strip
 * every non-digit, so "12.345" became 12345 and "-50" became 50 without a
 * word. Here nothing is rewritten: the text is either a valid amount or the
 * field says what is wrong with it.
 */

/** The API's ceiling for a money column (`Decimal(10, 2)`). */
export const MAX_MONEY = 99_999_999.99;

export type MoneyInputResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/**
 * An empty field is zero. Otherwise digits with at most one decimal point and
 * two decimals, thousands commas allowed (groups of three only), between 0 and MAX_MONEY.
 */
export function parseMoneyInput(text: string): MoneyInputResult {
  const raw = text.trim();
  // A comma is only a thousands separator: groups of three after the first.
  // Stripping them unchecked read "1,00" as 100 and "1,2,3" as 123.
  if (raw.includes(",") && !/^-?\d{1,3}(,\d{3})+(\.\d*)?$/.test(raw)) {
    return { ok: false, error: "Use commas only between groups of three digits." };
  }
  const trimmed = raw.replace(/,/g, "");
  if (trimmed === "") return { ok: true, value: 0 };
  if (trimmed.startsWith("-")) {
    return { ok: false, error: "Enter an amount of zero or more." };
  }
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") {
    return { ok: false, error: "Use digits and at most one decimal point." };
  }
  const [, decimals = ""] = trimmed.split(".");
  if (decimals.length > 2) {
    return { ok: false, error: "Use at most two decimal places." };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value > MAX_MONEY) {
    return { ok: false, error: "The most you can add is ฿99,999,999.99." };
  }
  return { ok: true, value };
}
