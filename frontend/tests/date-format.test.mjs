import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { formatDateTime, formatFieldDate } = loadTs('lib/date-format.ts');

const NOW = '2026-10-28T05:00:00.000Z';

test('a date in the current year leaves the year out', () => {
  // 03:00 UTC is 10:00 in Bangkok.
  assert.equal(formatDateTime('2026-01-01T03:00:00.000Z', NOW), 'Thu 1 Jan, 10:00');
});

test('a date in another year shows it, so a past meetup cannot pass for an upcoming one', () => {
  assert.equal(formatDateTime('2020-01-01T03:00:00.000Z', NOW), 'Wed 1 Jan 2020, 10:00');
  assert.equal(formatDateTime('2027-03-05T03:00:00.000Z', NOW), 'Fri 5 Mar 2027, 10:00');
});

test('the year is judged in Bangkok time, not UTC', () => {
  // 31 Dec 2026 20:00 UTC is already 1 Jan 2027 in Bangkok.
  assert.equal(
    formatDateTime('2026-12-31T20:00:00.000Z', '2027-01-01T01:00:00.000Z'),
    'Fri 1 Jan, 03:00',
  );
});

test('field dates read day, month, four-digit year', () => {
  assert.equal(formatFieldDate({ year: 2026, month: 10, day: 28 }), '28/10/2026');
  assert.equal(formatFieldDate({ year: 2027, month: 1, day: 5 }), '05/01/2027');
});
