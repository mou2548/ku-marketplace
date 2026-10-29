import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { formatPrice, formatPriceAmount } = loadTs('lib/format-price.ts');

test('whole baht prints without decimals', () => {
  assert.equal(formatPrice(0), '฿0');
  assert.equal(formatPrice(120), '฿120');
  assert.equal(formatPrice(9999999), '฿9,999,999');
  assert.equal(formatPrice(1200.0), '฿1,200');
});

test('a fraction prints exactly two decimals', () => {
  assert.equal(formatPrice(120.5), '฿120.50');
  assert.equal(formatPrice(99999999.99), '฿99,999,999.99');
  assert.equal(formatPrice(0.1 + 0.2), '฿0.30');
});

test('rounding to the satang can make an amount whole', () => {
  assert.equal(formatPrice(4.999), '฿5');
  assert.equal(formatPriceAmount(1234.5), '1,234.50');
});
