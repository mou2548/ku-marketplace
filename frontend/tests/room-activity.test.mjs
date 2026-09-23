import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

function load(path, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name] ?? {} });
  return exports;
}

const rooms = load('lib/rooms.ts', {
  '@/lib/deal-progress': load('lib/deal-progress.ts', {
    '@/lib/appointment': load('lib/appointment.ts'),
    '@/lib/date-format': load('lib/date-format.ts'),
    '@/lib/status': load('lib/status.ts'),
  }),
});

const user = (name) => ({ user_id: 1, name, isVerified: true });
function transaction(overrides = {}) {
  return {
    transaction_id: 1,
    buyer_id: 1,
    seller_id: 2,
    delivery_method: 'Meetup',
    status: 'Pending',
    created_at: '2026-09-01T00:00:00.000Z',
    buyer: user('Buyer'),
    seller: user('Seller'),
    post: { item: { name: 'Item', images: [] } },
    ...overrides,
  };
}
function source(id, overrides = {}, extra = {}) {
  return {
    transaction: transaction({ transaction_id: id, ...overrides }),
    roomId: id,
    viewerId: 1,
    needsYou: false,
    ...extra,
  };
}
// `vm.runInNewContext` gives the module its own realm, so an array it returns
// has that realm's prototype and fails a strict deep-equal against a plain
// literal. `Array.from` rebuilds it here.
const order = (built) => Array.from(built, (room) => room.room_id);

test('a deal with no messages still carries the timestamps its flow stamped', () => {
  const at = rooms.transactionActivityAt(
    transaction({ payment_confirmed_by_seller_at: '2026-09-05T00:00:00.000Z' }),
  );
  assert.equal(at, '2026-09-05T00:00:00.000Z');
});

test('every stamped step counts, and the newest one wins', () => {
  const steps = [
    'payment_confirmed_by_buyer_at',
    'payment_confirmed_by_seller_at',
    'item_received_confirmed_by_buyer_at',
    'item_received_confirmed_by_seller_at',
    'cancellation_requested_at',
    'refund_submitted_at',
    'item_return_confirmed_at',
  ];
  for (const step of steps) {
    assert.equal(
      rooms.transactionActivityAt(transaction({ [step]: '2026-09-09T00:00:00.000Z' })),
      '2026-09-09T00:00:00.000Z',
      `${step} should move the conversation`,
    );
  }
});

test('proposing and superseding a meetup both count as activity', () => {
  const at = rooms.transactionActivityAt(transaction(), [
    { created_at: '2026-09-02T00:00:00.000Z', deleted_at: '2026-09-06T00:00:00.000Z' },
    { created_at: '2026-09-04T00:00:00.000Z', deleted_at: null },
  ]);
  assert.equal(at, '2026-09-06T00:00:00.000Z');
});

test('unparseable and missing timestamps are ignored rather than sorting a room to the bottom', () => {
  assert.equal(rooms.latestTimestamp([undefined, null, 'not a date']), undefined);
  assert.equal(
    rooms.latestTimestamp([null, '2026-09-03T00:00:00.000Z', 'nonsense']),
    '2026-09-03T00:00:00.000Z',
  );
});

test('a status change outranks an older message, which the old message-only sort could not do', () => {
  const built = rooms.buildRooms({
    transactionRooms: [
      source(1, {}, { lastMessageAt: '2026-09-03T00:00:00.000Z' }),
      source(2, { payment_confirmed_by_seller_at: '2026-09-07T00:00:00.000Z' }),
    ],
    giveawayRooms: [],
  });
  assert.deepEqual(order(built), [2, 1]);
});

test('a newer message still outranks an older status change', () => {
  const built = rooms.buildRooms({
    transactionRooms: [
      source(1, {}, { lastMessageAt: '2026-09-10T00:00:00.000Z' }),
      source(2, { payment_confirmed_by_seller_at: '2026-09-07T00:00:00.000Z' }),
    ],
    giveawayRooms: [],
  });
  assert.deepEqual(order(built), [1, 2]);
});

test('a room opened by an accepted offer appears on top instead of at the bottom', () => {
  const built = rooms.buildRooms({
    transactionRooms: [
      source(1, {}, { lastMessageAt: '2026-09-02T00:00:00.000Z' }),
      source(2, { created_at: '2026-09-08T00:00:00.000Z' }),
    ],
    giveawayRooms: [],
  });
  assert.deepEqual(order(built), [2, 1]);
});

test('lastMessageAt keeps meaning "the last message", so the preview line stays honest', () => {
  const [room] = rooms.buildRooms({
    transactionRooms: [
      source(1, { payment_confirmed_by_seller_at: '2026-09-07T00:00:00.000Z' }, {
        lastMessageAt: '2026-09-03T00:00:00.000Z',
      }),
    ],
    giveawayRooms: [],
  });
  assert.equal(room.lastMessageAt, '2026-09-03T00:00:00.000Z');
  assert.equal(room.lastActivityAt, '2026-09-07T00:00:00.000Z');
});

test('a giveaway room with no messages yet is ordered by the giveaway opening, not dropped to the bottom', () => {
  const giveaway = (created_at) => ({
    giveaway_id: 1,
    item_name: 'Giveaway',
    giver: user('Giver'),
    images: [],
    created_at,
  });
  const built = rooms.buildRooms({
    transactionRooms: [source(1, {}, { lastMessageAt: '2026-09-05T00:00:00.000Z' })],
    giveawayRooms: [{ giveaway: giveaway('2026-09-11T00:00:00.000Z'), roomId: 9 }],
  });
  assert.deepEqual(order(built), [9, 1]);

  const older = rooms.buildRooms({
    transactionRooms: [source(1, {}, { lastMessageAt: '2026-09-05T00:00:00.000Z' })],
    giveawayRooms: [{ giveaway: giveaway('2026-09-01T00:00:00.000Z'), roomId: 9 }],
  });
  assert.deepEqual(order(older), [1, 9]);
});

test('name and counterparty sorts break ties on activity, not on messages alone', () => {
  const built = rooms.buildRooms({
    transactionRooms: [
      source(1, { payment_confirmed_by_seller_at: '2026-09-04T00:00:00.000Z' }),
      source(2, { payment_confirmed_by_seller_at: '2026-09-12T00:00:00.000Z' }),
    ],
    giveawayRooms: [],
  });
  assert.deepEqual(order(rooms.sortRooms(built, 'name')), [2, 1]);
});
