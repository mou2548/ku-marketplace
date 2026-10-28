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

const { getNotifications } = loadTs('lib/api/notifications.ts', {
  './client': { apiFetch: async () => persisted },
  './session': { authHeader: async () => ({}) },
  '@/lib/copy': { getCopy: async () => (key) => key },
  '@/lib/api/giveaways': {
    getGiveaways: async () => [],
    getMyTicket: async () => undefined,
  },
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
