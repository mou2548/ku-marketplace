import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { isHandedOver, freeUnits, unavailableReason } = loadTs('lib/item-availability.ts');

const summary = (overrides = {}) => ({
  available_quantity: 1,
  ongoing_quantity: 0,
  channels: [],
  ...overrides,
});
const listing = { type: 'post', post_id: 1, post_type: 'SellOnly', quantity_total: 1, quantity_remaining: 1 };

test('a Transferred status wins over a summary that still reports free units', () => {
  const item = { quantity: 1, status: 'Transferred' };
  assert.equal(isHandedOver(item, summary()), true);
  assert.equal(freeUnits(item, summary()), 0);
  assert.equal(unavailableReason(item, summary(), 'some'), 'handed-over');
  assert.equal(unavailableReason(item, undefined, 'whole'), 'handed-over');
});

test('every unit gone with nothing open and no deal running reads as handed over', () => {
  const item = { quantity: 2, status: 'Unlisted' };
  assert.equal(isHandedOver(item, summary({ available_quantity: 0 })), true);
  assert.equal(unavailableReason(item, summary({ available_quantity: 0 }), 'some'), 'handed-over');
});

test('a unit reserved by an unfinished deal is in a deal, not handed over', () => {
  const item = { quantity: 1, status: 'Listed' };
  const s = summary({ available_quantity: 0, ongoing_quantity: 1, channels: [listing] });
  assert.equal(isHandedOver(item, s), false);
  assert.equal(freeUnits(item, s), 0);
  assert.equal(unavailableReason(item, s, 'some'), 'in-deal');
  // Even after the post closes on its last unit, the deal is still running.
  assert.equal(unavailableReason(item, summary({ available_quantity: 0, ongoing_quantity: 1 }), 'some'), 'in-deal');
});

test('fully listed and partly listed items', () => {
  const item = { quantity: 3, status: null };
  assert.equal(unavailableReason(item, summary({ available_quantity: 0, channels: [listing] }), 'some'), 'all-listed');
  const partly = summary({ available_quantity: 2, channels: [listing] });
  assert.equal(freeUnits(item, partly), 2);
  assert.equal(unavailableReason(item, partly, 'some'), null);
  assert.equal(unavailableReason(item, partly, 'whole'), 'partly-listed');
});

test('a free item is usable; without a summary the quantity is the fallback', () => {
  const item = { quantity: 2 };
  assert.equal(unavailableReason(item, summary({ available_quantity: 2 }), 'whole'), null);
  assert.equal(freeUnits(item, undefined), 2);
  assert.equal(unavailableReason(item, undefined, 'whole'), null);
});
