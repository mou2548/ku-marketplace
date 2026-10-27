/**
 * PromptPay "Thai QR Payment" payloads (EMVCo merchant-presented QR, tag 29:
 * credit transfer to a PromptPay ID). The bank app that scans one shows the
 * registered account name and the amount, and the payer cannot edit either.
 *
 * Only mobile numbers are accepted as an ID. A national ID would work too, but
 * the ID travels in clear text inside every QR the buyer is shown.
 */

const THAI_MOBILE = /^0[689]\d{8}$/;

/** `081-234-5678` → `0812345678`; null when it is not a Thai mobile number. */
export function normalizePromptPayId(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  return THAI_MOBILE.test(digits) ? digits : null;
}

/** `0812345678` → `xxx-xxx-5678`, for showing which account a QR pays. */
export function maskPromptPayId(mobile: string): string {
  return `xxx-xxx-${mobile.slice(-4)}`;
}

const field = (id: string, value: string) =>
  id + String(value.length).padStart(2, '0') + value;

/** CRC-16/CCITT-FALSE over the payload, including the `6304` that precedes it. */
function checksum(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * The text to encode as a QR for paying `amount` baht to `mobile` (already
 * normalised). Point-of-initiation `12` marks it as a one-off code carrying
 * its own amount.
 */
export function promptPayPayload(mobile: string, amount: number): string {
  if (!THAI_MOBILE.test(mobile)) {
    throw new Error('promptPayPayload needs a normalised Thai mobile number');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('promptPayPayload needs a positive amount');
  }
  const payload =
    field('00', '01') +
    field('01', '12') +
    field(
      '29',
      field('00', 'A000000677010111') +
        // The mobile number in international form, zero-padded to 13 digits.
        field('01', `0066${mobile.slice(1)}`),
    ) +
    field('58', 'TH') +
    field('53', '764') +
    field('54', amount.toFixed(2)) +
    '6304';
  return payload + checksum(payload);
}
