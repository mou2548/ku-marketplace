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
