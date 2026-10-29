import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { giveawayPhase, isBrowsable } = loadTs('lib/giveaway-phase.ts');

const NOW = Date.parse('2026-10-28T12:00:00Z');
const giveaway = (overrides = {}) => ({
  status: 'Active',
  allocation_method: 'Random',
  register_start: '2026-10-20T00:00:00Z',
  register_deadline: '2026-10-30T00:00:00Z',
  remaining_slots: 1,
  registration_open: true,
  ...overrides,
});

test('stored status wins once the giveaway has moved past Active', () => {
  assert.equal(giveawayPhase(giveaway({ status: 'Closed' }), NOW), 'pickup');
  assert.equal(giveawayPhase(giveaway({ status: 'Completed' }), NOW), 'finished');
});

test('an Active giveaway is read from its dates, not its status', () => {
  assert.equal(giveawayPhase(giveaway(), NOW), 'open');
  assert.equal(giveawayPhase(giveaway({ register_start: '2026-11-01T00:00:00Z' }), NOW), 'upcoming');
  // The G01 case: still Active, deadline gone.
  assert.equal(giveawayPhase(giveaway({ register_deadline: '2026-10-27T00:00:00Z' }), NOW), 'closed');
  assert.equal(
    giveawayPhase(giveaway({ allocation_method: 'FirstCome', remaining_slots: 0 }), NOW),
    'full',
  );
  assert.equal(giveawayPhase(giveaway({ register_start: null, register_deadline: null }), NOW), 'open');
});

test('without a clock it falls back on the API flag', () => {
  assert.equal(giveawayPhase(giveaway(), null), 'open');
});

test('without a clock a shut giveaway is named only when the dates leave one reason', () => {
  const shut = (overrides) => giveawayPhase(giveaway({ registration_open: false, ...overrides }), null);
  // No start date: it cannot be upcoming, so the deadline has passed.
  assert.equal(shut({ register_start: null }), 'closed');
  // No deadline: it cannot be past it, so it has not opened yet.
  assert.equal(shut({ register_deadline: null }), 'upcoming');
  // No dates at all: only a full first-come giveaway is shut.
  assert.equal(
    shut({ register_start: null, register_deadline: null, allocation_method: 'FirstCome', remaining_slots: 0 }),
    'full',
  );
  // Both dates: upcoming or closed, and only the clock can tell. Saying
  // "closed" here flipped to "upcoming" after hydration.
  assert.equal(shut({}), null);
  assert.equal(shut({ allocation_method: 'FirstCome', remaining_slots: 0 }), null);
  assert.equal(
    shut({ register_start: null, allocation_method: 'FirstCome', remaining_slots: 0 }),
    null,
  );
  assert.equal(isBrowsable(null), false);
});

test('only open and upcoming giveaways are browsable', () => {
  assert.deepEqual(
    ['upcoming', 'open', 'full', 'closed', 'pickup', 'finished'].filter(isBrowsable),
    ['upcoming', 'open'],
  );
});
