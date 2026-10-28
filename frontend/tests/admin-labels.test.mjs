import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const labels = loadTs('lib/admin-labels.ts');
const NOW = Date.parse('2026-10-06T12:00:00Z');
const ago = (ms) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

test('waitingFor rounds down to minutes, hours, then days', () => {
  assert.equal(labels.waitingFor(ago(10 * 1000), NOW), '1m');
  assert.equal(labels.waitingFor(ago(59 * MIN), NOW), '59m');
  assert.equal(labels.waitingFor(ago(HOUR), NOW), '1h');
  assert.equal(labels.waitingFor(ago(23 * HOUR + 59 * MIN), NOW), '23h');
  assert.equal(labels.waitingFor(ago(DAY), NOW), '1d');
  assert.equal(labels.waitingFor(ago(3 * DAY + 5 * HOUR), NOW), '3d');
});

test('waitingFor never goes negative for a clock slightly ahead', () => {
  assert.equal(labels.waitingFor(new Date(NOW + MIN).toISOString(), NOW), '1m');
});

test('waitingForLong spells units and plurals', () => {
  assert.equal(labels.waitingForLong(ago(MIN), NOW), '1 minute');
  assert.equal(labels.waitingForLong(ago(5 * HOUR), NOW), '5 hours');
  assert.equal(labels.waitingForLong(ago(DAY), NOW), '1 day');
  assert.equal(labels.waitingForLong(ago(3 * DAY), NOW), '3 days');
});

test('a case is open until it is decided', () => {
  for (const status of ['Pending', 'Under_Investigation'])
    assert.equal(labels.isOpenReport({ status }), true);
  for (const status of ['Violation_Confirmed', 'Report_Dismissed'])
    assert.equal(labels.isOpenReport({ status }), false);
  for (const status of ['Pending', 'Under_Review'])
    assert.equal(labels.isOpenAppeal({ status }), true);
  for (const status of ['Approved', 'Rejected'])
    assert.equal(labels.isOpenAppeal({ status }), false);
});

test('a temporary suspension is described with its length', () => {
  assert.equal(labels.TEMPORARY_SUSPENSION_DAYS, 3);
  assert.equal(labels.ADMIN_SANCTION.suspend_temporary, 'Suspended for 3 days');
});

test('status labels name a missing or unknown value instead of guessing', () => {
  assert.equal(labels.accountStatusLabel('Banned').label, 'Banned');
  assert.equal(labels.accountStatusLabel(null).label, 'Not set');
  assert.equal(labels.accountStatusLabel('Frozen').label, 'Unknown (Frozen)');
  assert.equal(labels.transactionStatusLabel('Pending Refund').label, 'Refunding');
  assert.equal(labels.transactionStatusLabel(null).label, 'Not set');
});

test('presetRange covers whole Bangkok days ending today', () => {
  // 2026-10-06 12:00 UTC is 19:00 the same day in Bangkok.
  // The module runs in its own vm realm, so compare fields, not objects.
  const week = labels.presetRange('7', NOW);
  assert.equal(week.from, '2026-09-30');
  assert.equal(week.to, '2026-10-06');
  // 18:00 UTC is already 01:00 on the 7th in Bangkok.
  assert.equal(labels.presetRange('7', NOW + 6 * HOUR).to, '2026-10-07');
});

test('formatBaht groups thousands and keeps satang', () => {
  assert.equal(labels.formatBaht(12500), '฿12,500');
  assert.equal(labels.formatBaht(99.5), '฿99.5');
});
