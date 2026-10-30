import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { dealBadgeKeys, serializeSeenKeys, parseSeenKeys, pruneSeenKeys, unseenCount, dealsSeenCookie } =
  loadTs('lib/deal-badge.ts', {}, { Set, RegExp, encodeURIComponent, decodeURIComponent });
const plain = (value) => JSON.parse(JSON.stringify(value));
const entry = (id, labelKey) => ({ id, prompt: { labelKey } });

test('one key per deal and step, sorted and unique', () => {
  const keys = dealBadgeKeys([entry(8, 'prompt.pay.you'), entry(3, 'prompt.scan-qr.you'), entry(8, 'prompt.pay.you')]);
  assert.deepEqual(plain(keys), ['3:prompt.scan-qr.you', '8:prompt.pay.you']);
});

test('the cookie round-trips and stays compact', () => {
  const keys = ['3:prompt.scan-qr.you', '8:prompt.pay.you'];
  const raw = serializeSeenKeys(keys);
  assert.deepEqual(plain(parseSeenKeys(raw)), keys);
  assert.deepEqual(plain(parseSeenKeys(decodeURIComponent(raw))), keys);
  assert.ok(raw.length < 50, raw);
});

test('a missing or malformed cookie reads as nothing seen', () => {
  for (const raw of [undefined, null, '', '%E0%A4%A', 'not a key', '[1,2]']) {
    assert.deepEqual(plain(parseSeenKeys(raw)), []);
  }
});

test('the dot is off after a visit, on for a new deal or a new step', () => {
  const seen = ['3:prompt.scan-qr.you', '8:prompt.pay.you'];
  assert.equal(unseenCount(['3:prompt.scan-qr.you', '8:prompt.pay.you'], seen), 0);
  assert.equal(unseenCount([...seen, '9:prompt.pay.you'], seen), 1);
  assert.equal(unseenCount(['3:prompt.confirm.you', '8:prompt.pay.you'], seen), 1);
  assert.equal(unseenCount([], []), 0);
});

test('a deal that leaves the list and comes back counts as new', () => {
  let seen = ['42:prompt.upload-slip.you'];
  seen = pruneSeenKeys(seen, []); // uploaded: now the seller's turn
  assert.deepEqual(plain(seen), []);
  assert.equal(unseenCount(['42:prompt.upload-slip.you'], seen), 1); // slip rejected, back again
});

test('each account has its own cookie', () => {
  assert.notEqual(dealsSeenCookie(3), dealsSeenCookie(4));
});
