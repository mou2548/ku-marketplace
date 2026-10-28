import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { openReturnWindow, RETURN_WINDOW_MS } = loadTs('lib/return-window.ts');

const DAY = 86400000;
const completedAt = Date.parse('2026-10-20T09:00:00.000Z');
const done = (over = {}) => ({
  status: 'Completed',
  item_received_confirmed_by_buyer_at: new Date(completedAt).toISOString(),
  cancellation_requested_by: null,
  active_report_id: null,
  ...over,
});

test('the window runs 7 days from the buyer\'s receipt, counted in whole days left', () => {
  assert.equal(openReturnWindow(done(), completedAt + 1000).daysLeft, 7);
  assert.equal(openReturnWindow(done(), completedAt + 6 * DAY + 1000).daysLeft, 1);
  assert.equal(openReturnWindow(done(), completedAt).closesAt, completedAt + RETURN_WINDOW_MS);
  assert.equal(openReturnWindow(done(), completedAt + 7 * DAY), undefined);
});

test('no window once a request exists, under review, or before completion', () => {
  const now = completedAt + DAY;
  assert.equal(openReturnWindow(done({ cancellation_requested_by: 2 }), now), undefined);
  assert.equal(openReturnWindow(done({ active_report_id: 9 }), now), undefined);
  assert.equal(openReturnWindow(done({ status: 'Processing' }), now), undefined);
  assert.equal(openReturnWindow(done({ item_received_confirmed_by_buyer_at: null }), now), undefined);
});
