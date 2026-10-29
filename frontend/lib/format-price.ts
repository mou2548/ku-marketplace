/**
 * The one price format for the app (audit E03). The same amount used to read
 * as `฿120.5`, `฿99,999,999.99` or `฿9,999,999` depending on the screen.
 *
 *   - whole baht: no decimals, `฿1,200`
 *   - anything else: exactly two decimals, `฿120.50`
 *   - thousands separators always
 *
 * Amounts are rounded to the satang first, so a float like 0.1 + 0.2 never
 * prints as `฿0.30000000000000004` or keeps a stray `.00`.
 */

const WHOLE = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const SATANG = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** The number part only, `1,200` or `120.50`, for layouts that set the `฿` apart. */
export function formatPriceAmount(amount: number): string {
  const satang = Math.round(amount * 100);
  return satang % 100 === 0 ? WHOLE.format(satang / 100) : SATANG.format(satang / 100);
}

/** `฿1,200`, `฿120.50`. */
export function formatPrice(amount: number): string {
  return `฿${formatPriceAmount(amount)}`;
}
