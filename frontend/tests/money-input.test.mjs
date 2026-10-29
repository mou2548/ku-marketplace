import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { parseMoneyInput: parseInVm, MAX_MONEY } = loadTs('lib/money-input.ts', {}, { RegExp });
// Results come from another realm; copy them so deepEqual compares plain objects.
const parseMoneyInput = (text) => ({ ...parseInVm(text) });

test('empty is zero and plain amounts parse', () => {
  assert.deepEqual(parseMoneyInput(''), { ok: true, value: 0 });
  assert.deepEqual(parseMoneyInput(' 50 '), { ok: true, value: 50 });
  assert.deepEqual(parseMoneyInput('12.34'), { ok: true, value: 12.34 });
  assert.deepEqual(parseMoneyInput('12.'), { ok: true, value: 12 });
  assert.deepEqual(parseMoneyInput('1,200.5'), { ok: true, value: 1200.5 });
  assert.deepEqual(parseMoneyInput('99999999.99'), { ok: true, value: MAX_MONEY });
});

test('invalid text is refused, never rewritten', () => {
  for (const text of ['12.345', '-50', '1.2.3', 'abc', '.', '12e4', '100000000']) {
    assert.equal(parseMoneyInput(text).ok, false, text);
  }
});

test('commas count only as thousands separators', () => {
  assert.deepEqual(parseMoneyInput('1,000'), { ok: true, value: 1000 });
  assert.deepEqual(parseMoneyInput('12,345,678.90'), { ok: true, value: 12345678.9 });
  for (const text of ['1,00', '1,2,3', ',100', '1000,000', '1,0000', '1,000,', '1.000,5']) {
    assert.equal(parseMoneyInput(text).ok, false, text);
  }
});
