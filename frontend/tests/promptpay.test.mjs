import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { promptPayPayload, crc16, maskMobile, MEMBERSHIP_PROMPTPAY } = loadTs('lib/promptpay.ts', {}, { RegExp });

test('CRC-16/CCITT-FALSE check value', () => {
  assert.equal(crc16('123456789'), '29B1');
});

test('payload matches the one the API builds for a deal', () => {
  // GET /transactions/4/payment-qr on the local seed, seller PromptPay 0909389199.
  assert.equal(
    promptPayPayload('0909389199', 13500),
    '00020101021229370016A000000677010111011300669093891995802TH5303764540813500.006304102F',
  );
});

test('membership prices carry two decimals and a valid CRC', () => {
  const payload = promptPayPayload(MEMBERSHIP_PROMPTPAY, 49);
  assert.match(payload, /540549\.006304[0-9A-F]{4}$/);
  assert.equal(payload.slice(-4), crc16(payload.slice(0, -4)));
  assert.ok(payload.includes('01130066909389199'));
});

test('dashes and spaces in the number are ignored; bad input throws', () => {
  assert.equal(promptPayPayload('090-938-9199', 29), promptPayPayload('0909389199', 29));
  assert.throws(() => promptPayPayload('12345', 29));
  assert.throws(() => promptPayPayload('0909389199', 0));
});

test('masked like the API', () => {
  assert.equal(maskMobile('0909389199'), 'xxx-xxx-9199');
});
