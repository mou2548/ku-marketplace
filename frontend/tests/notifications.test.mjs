import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadTs } from './load-ts.mjs';

const persisted = [
  {
    notification_id: 1,
    kind: 'moderation',
    title: 'Your account is suspended for 3 days',
    body: '',
    href: '/account/appeals',
    created_at: '2026-10-06T00:00:00Z',
    read: false,
  },
];

// A giveaway the viewer (user 9) owns, two people registered and one already
// drawn; and one they do not own, which must raise nothing for them.
const giveaways = [
  { giveaway_id: 7, giver_id: 9, item_name: 'GG', created_at: '2026-10-30T10:00:00Z' },
  { giveaway_id: 8, giver_id: 3, item_name: 'Lamp', created_at: '2026-10-30T11:00:00Z' },
];
const rosters = {
  7: [
    { receiver_id: 21, ticket_status: 'Registered', user: { name: 'Somchai' } },
    { receiver_id: 22, ticket_status: 'Registered', user: { name: 'Somsri' } },
    { receiver_id: 23, ticket_status: 'Waiting', user: { name: 'Already drawn' } },
    { receiver_id: 24, ticket_status: 'Received', user: { name: 'Collected' } },
    { receiver_id: 25, ticket_status: 'Not_Selected', user: { name: 'Missed out' } },
  ],
  8: [{ receiver_id: 31, ticket_status: 'Registered', user: { name: 'Nobody' } }],
};

const { getNotifications } = loadTs('lib/api/notifications.ts', {
  './client': { apiFetch: async () => [...persisted] },
  './session': { authHeader: async () => ({}) },
  '@/lib/copy': { getCopy: async () => (key) => key },
  '@/lib/api/giveaways': {
    getGiveaways: async () => giveaways,
    getRecipients: async (id) => rosters[id] ?? [],
    ticketFromRoster: () => undefined,
  },
  '@/lib/registration-notice': loadTs('lib/registration-notice.ts'),
  '@/lib/api/offers': { getMyOffers: async () => [] },
  '@/lib/api/session': { getCurrentUserId: async () => 9 },
  '@/lib/api/transactions': { getTransactions: async () => [] },
  '@/lib/format-price': loadTs('lib/format-price.ts'),
  '@/lib/status': {
    TICKET_STATUS: {},
    transactionStatusPresentation: () => ({}),
  },
});

test('moderation rows in the bell come only from the backend', async () => {
  const rows = await getNotifications();
  const moderation = rows.filter((row) => row.kind === 'moderation');
  assert.equal(JSON.stringify(moderation), JSON.stringify(persisted));
});

test('the bell does not read reports or appeals to derive rows', () => {
  const source = fs.readFileSync('lib/api/notifications.ts', 'utf8');
  assert.doesNotMatch(source, /from ["'][^"']*\/(reports|appeals)["']/);
});

test('the owner hears how many have registered, and who', async () => {
  const rows = await getNotifications();
  const owner = rows.filter((row) => row.title.includes('registered'));
  assert.equal(owner.length, 1);
  assert.equal(owner[0].title, '2 people registered: GG');
  assert.equal(owner[0].body, 'Somchai and Somsri.');
  assert.equal(owner[0].href, '/giveaway/7/manage');
  assert.equal(owner[0].kind, 'giveaway');
  assert.equal(owner[0].read, false);
});

test('the owner hears that places were given, counted over everyone ever given one', async () => {
  const rows = await getNotifications();
  const granted = rows.filter((row) => row.title.includes('got a place'));
  assert.equal(granted.length, 1);
  // Waiting and Received count; Registered and Not_Selected do not.
  assert.equal(granted[0].title, '2 people got a place: GG');
  assert.equal(granted[0].body, 'Already drawn and Collected.');
  assert.equal(granted[0].href, '/giveaway/7/manage');
  assert.equal(granted[0].read, false);
});

test('a giveaway owned by someone else raises nothing for the viewer', async () => {
  const rows = await getNotifications();
  assert.equal(rows.some((row) => row.href === '/giveaway/8/manage'), false);
});

test('no one waiting any more means no "got a place" row', async () => {
  rosters[7] = rosters[7].map((row) =>
    row.ticket_status === 'Waiting' ? { ...row, ticket_status: 'Received' } : row,
  );
  const rows = await getNotifications();
  assert.equal(rows.some((row) => row.title.includes('got a place')), false);
});
