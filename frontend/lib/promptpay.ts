/**
 * PromptPay QR payloads (Thai QR Payment, EMVCo merchant-presented format).
 *
 * Deals get their payload from the API (`GET /transactions/:id/payment-qr`),
 * which knows the seller's number. Membership has no such endpoint, so its
 * payload is built here for the platform's own account and the tier price.
 */

/**
 * Where membership fees go. The API exposes no payee for memberships
 * (docs/design/api-gaps.md), so the account is fixed here, owner choice
 * 2026-10-30.
 */
export const MEMBERSHIP_PROMPTPAY = "0909389199";

/** One EMVCo field: id, two-digit length, value. */
function field(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as the spec requires. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * The payload for paying `amount` baht to a mobile-number PromptPay account.
 * A fixed amount makes it a one-time ("dynamic") QR, so the banking app fills
 * the amount in and the payer cannot change it.
 */
export function promptPayPayload(mobile: string, amount: number): string {
  const digits = mobile.replace(/\D/g, "");
  if (!/^0\d{9}$/.test(digits)) {
    throw new Error("A PromptPay mobile number has 10 digits and starts with 0.");
  }
  if (!(amount > 0)) throw new Error("A PromptPay amount must be above zero.");

  // 0066 + the number without its leading 0, zero-padded to 13 digits.
  const proxy = `0066${digits.slice(1)}`.padStart(13, "0");
  const body =
    field("00", "01") +
    field("01", "12") +
    field("29", field("00", "A000000677010111") + field("01", proxy)) +
    field("58", "TH") +
    field("53", "764") +
    field("54", amount.toFixed(2)) +
    "6304";
  return body + crc16(body);
}

/** "xxx-xxx-9199": enough to recognise the account, as the API masks it. */
export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  return `xxx-xxx-${digits.slice(-4)}`;
}
