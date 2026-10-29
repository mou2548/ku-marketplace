import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const formatPrice = loadTs('lib/format-price.ts');
const labels = loadTs('lib/admin-labels.ts', {
  '@/lib/format-price': formatPrice,
});
const unused = () => {
  throw new Error('not called in this test');
};
const { buildQueueRows, restrictedAccounts } = loadTs('lib/admin.ts', {
  react: { cache: (fn) => fn },
  '@/lib/api/appeals': { adminListAppeals: unused },
  '@/lib/api/membership': { listPendingPayments: unused },
  '@/lib/api/reports': { adminListReports: unused },
  '@/lib/admin-labels': labels,
  '@/lib/format-price': formatPrice,
});

const report = (id, status, created_at) => ({
  report_id: id,
  status,
  created_at,
  reason_category: 'Scam',
  report_type: 'User',
  target_id: 9,
  handled_by: status === 'Pending' ? null : 1,
  reporter: { user_id: 5, name: 'Ploy' },
  reported_user: { user_id: 9, name: 'Somchai', status: 'Active' },
});
const appeal = (id, status, created_at) => ({
  appeal_id: id,
  report_id: 40 + id,
  status,
  created_at,
  appellant: { name: 'Nattapong' },
  handled_by: status === 'Pending' ? null : 1,
});

const queues = {
  reports: [
    report(1, 'Pending', '2026-10-03T00:00:00Z'),
    report(2, 'Under_Investigation', '2026-10-01T00:00:00Z'),
    report(3, 'Violation_Confirmed', '2026-09-01T00:00:00Z'),
  ],
  appeals: [
    appeal(1, 'Under_Review', '2026-10-02T00:00:00Z'),
    appeal(2, 'Rejected', '2026-09-02T00:00:00Z'),
  ],
  memberships: [
    {
      request_id: 7,
      user: { name: 'Ploy' },
      amount: 199,
      created_at: '2026-10-04T00:00:00Z',
    },
  ],
};

test('lists every open case across the queues, oldest first', () => {
  const rows = buildQueueRows(queues);
  assert.equal(
    JSON.stringify(rows.map((r) => r.key)),
    JSON.stringify(['report-2', 'appeal-1', 'report-1', 'membership-7']),
  );
});

test('labels rows with the admin vocabulary and links to the case', () => {
  const rows = Object.fromEntries(buildQueueRows(queues).map((r) => [r.key, r]));
  assert.equal(rows['report-1'].status.label, 'New');
  assert.equal(rows['report-2'].status.label, 'Under investigation');
  assert.equal(rows['report-2'].href, '/admin/reports/2');
  assert.equal(rows['report-2'].detail, 'Scam · Ploy reported Somchai');
  assert.equal(rows['appeal-1'].status.label, 'Under review');
  assert.equal(rows['appeal-1'].detail, 'Against report #41 · Nattapong');
  assert.equal(rows['membership-7'].href, '/admin/memberships');
  assert.equal(rows['membership-7'].status.label, 'Slip to check');
});

test('never names who holds a case: there is one admin', () => {
  for (const row of buildQueueRows(queues)) assert.equal('openedBy' in row, false);
});

test('restricted accounts: running suspensions and bans, lifted ones gone', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  const decided = (id, userId, status, sanction, handledAt) => ({
    ...report(id, 'Violation_Confirmed', '2026-10-01T00:00:00Z'),
    sanction,
    handled_at: handledAt,
    reported_user: { user_id: userId, name: `User ${userId}`, status },
  });
  const accounts = restrictedAccounts(
    {
      reports: [
        decided(10, 1, 'Suspended', 'suspend_temporary', '2026-10-06T00:00:00Z'),
        decided(11, 2, 'Suspended', 'suspend_temporary', '2026-10-01T00:00:00Z'),
        decided(12, 3, 'Banned', 'suspend_permanent', '2026-09-01T00:00:00Z'),
        decided(13, 4, 'Active', 'warn', '2026-10-06T00:00:00Z'),
      ],
      appeals: [],
      memberships: [],
    },
    now,
  );
  assert.equal(
    JSON.stringify(accounts.map((a) => [a.user.user_id, a.status, a.until])),
    JSON.stringify([
      [3, 'Banned', null],
      [1, 'Suspended', '2026-10-09T00:00:00.000Z'],
    ]),
  );
});

