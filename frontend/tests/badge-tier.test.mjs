import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const status = loadTs('lib/status.ts', {
  '@/lib/slip-state': { isSlipRejected: (tx) => tx.slip_image_url === null },
});
const tier = loadTs('lib/badge-tier.ts', { '@/lib/status': status });
const adminLabels = loadTs('lib/admin-labels.ts', {
  '@/lib/format-price': loadTs('lib/format-price.ts'),
});

const MAPS = [
  'TRANSACTION_STATUS',
  'OFFER_STATUS',
  'POST_TYPE',
  'TICKET_STATUS',
  'ENTRANT_STATUS',
  'ALLOCATION_METHOD',
  'APPOINTMENT_STATUS',
  'GIVEAWAY_STATUS',
  'USER_STATUS',
  'SANCTION_TYPE',
  'SUBSCRIPTION_STATUS',
  'SUBSCRIPTION_PAYMENT_STATUS',
  'REPORT_STATUS',
  'APPEAL_STATUS',
];

const actNow = () => {
  const out = [];
  for (const name of MAPS) {
    for (const [key, p] of Object.entries(status[name])) {
      if (tier.badgeTier(p.tone, p.lifecycle, true) === 'act') out.push(`${name}.${key}`);
    }
  }
  return out.sort();
};

test('every presentation declares a lifecycle', () => {
  for (const name of MAPS) {
    for (const [key, p] of Object.entries(status[name])) {
      assert.ok(
        ['open', 'ended', 'category'].includes(p.lifecycle),
        `${name}.${key} has lifecycle ${p.lifecycle}`,
      );
    }
  }
  assert.equal(status.ITEM_TRANSFERRED_STATUS.lifecycle, 'ended');
});

test('act-capable statuses: open warning and danger, for the viewer who acts', () => {
  assert.deepEqual(actNow(), [
    'APPEAL_STATUS.Pending',
    'APPOINTMENT_STATUS.Pending',
    'OFFER_STATUS.Pending',
    'REPORT_STATUS.Pending',
    'SUBSCRIPTION_PAYMENT_STATUS.Pending',
    'TICKET_STATUS.Waiting',
    'TRANSACTION_STATUS.Pending',
    'TRANSACTION_STATUS.Pending Refund',
    'USER_STATUS.Banned',
    'USER_STATUS.Suspended',
  ]);
});

test('ended states are information tier and neutral, even when danger', () => {
  for (const [name, key] of [
    ['TRANSACTION_STATUS', 'Cancelled'],
    ['OFFER_STATUS', 'Rejected'],
    ['TICKET_STATUS', 'Expired'],
    ['TICKET_STATUS', 'Not_Selected'],
    ['ENTRANT_STATUS', 'Not_Selected'],
    ['ENTRANT_STATUS', 'Expired'],
    ['APPOINTMENT_STATUS', 'Rejected'],
    ['GIVEAWAY_STATUS', 'Closed'],
    ['SUBSCRIPTION_STATUS', 'Expired'],
    ['SUBSCRIPTION_PAYMENT_STATUS', 'Reject'],
    ['REPORT_STATUS', 'Violation_Confirmed'],
    ['APPEAL_STATUS', 'Rejected'],
  ]) {
    const p = status[name][key];
    assert.equal(p.lifecycle, 'ended', `${name}.${key}`);
    assert.equal(tier.badgePaint(p.tone, p.lifecycle, true), 'neutral', `${name}.${key}`);
  }
});

test('categories are never urgent and trade has no colour', () => {
  for (const name of ['POST_TYPE', 'ALLOCATION_METHOD', 'SANCTION_TYPE']) {
    for (const p of Object.values(status[name])) {
      assert.equal(tier.badgeTier(p.tone, p.lifecycle, true), 'info');
    }
  }
  assert.equal(tier.badgePaint('trade', 'open'), 'neutral');
  assert.equal(tier.badgePaint('trade', 'category'), 'neutral');
});

test('paint follows tier and severity', () => {
  assert.equal(tier.badgePaint('warning', 'open', true), 'act-warning');
  assert.equal(tier.badgePaint('danger', 'open', true), 'act-danger');
  assert.equal(tier.badgePaint('success', 'ended'), 'success');
  assert.equal(tier.badgePaint('success', 'open'), 'success');
  assert.equal(tier.badgePaint('info', 'open'), 'neutral');
  assert.equal(tier.badgePaint('neutral', 'ended'), 'neutral');
});

test('a cash-free trade still waiting is act now', () => {
  const p = status.transactionStatusPresentation({
    status: 'Pending',
    delivery_method: 'Meetup',
    offer_id: 4,
    additional_money: 0,
  });
  assert.equal(tier.badgeTier(p.tone, p.lifecycle, true), 'act');
});

test('without a derived actor every badge is information tier', () => {
  for (const name of MAPS) {
    for (const p of Object.values(status[name])) {
      assert.equal(tier.badgeTier(p.tone, p.lifecycle), 'info');
    }
  }
});

const tx = (over) => ({
  status: 'Pending',
  delivery_method: 'Meetup',
  offer_id: null,
  additional_money: 0,
  payment_confirmed_by_buyer_at: null,
  payment_confirmed_by_seller_at: null,
  slip_image_url: 'x',
  ...over,
});

test('a deal is act now only for the party whose turn it is', () => {
  // Unpaid sale: the buyer uploads the slip.
  assert.equal(tier.viewerActsOnTransaction(tx(), 'buyer'), true);
  assert.equal(tier.viewerActsOnTransaction(tx(), 'seller'), false);
  // Slip sent: the seller reviews it.
  const paid = tx({ payment_confirmed_by_buyer_at: '2026-10-30T00:00:00Z' });
  assert.equal(tier.viewerActsOnTransaction(paid, 'seller'), true);
  assert.equal(tier.viewerActsOnTransaction(paid, 'buyer'), false);
  // Over: nobody.
  for (const s of ['Completed', 'Cancelled', 'Refunded']) {
    assert.equal(tier.viewerActsOnTransaction(tx({ status: s }), 'buyer'), false);
    assert.equal(tier.viewerActsOnTransaction(tx({ status: s }), 'seller'), false);
  }
});

test('an offer is act now only for its receiver while pending', () => {
  assert.equal(tier.viewerActsOnOffer('Pending', 'received'), true);
  assert.equal(tier.viewerActsOnOffer('Pending', 'sent'), false);
  for (const s of ['Accepted', 'Rejected', 'Cancelled', 'Withdrawn'])
    assert.equal(tier.viewerActsOnOffer(s, 'received'), false);
});

test('a pending meetup is act now only for the side it awaits', () => {
  assert.equal(tier.viewerActsOnAppointment('Pending', true), true);
  assert.equal(tier.viewerActsOnAppointment('Pending', false), false);
  assert.equal(tier.viewerActsOnAppointment('Confirmed', true), false);
  assert.equal(tier.viewerActsOnAppointment('Rejected', true), false);
});

test('a waiting ticket is act now only for its holder', () => {
  assert.equal(tier.viewerActsOnTicket('Waiting', true), true);
  assert.equal(tier.viewerActsOnTicket('Waiting', false), false);
  for (const s of ['Registered', 'Received', 'Not_Selected', 'Forfeited', 'Expired'])
    assert.equal(tier.viewerActsOnTicket(s, true), false);
});

test('a closed registration is act now only for a Manual giver', () => {
  assert.equal(tier.viewerActsOnGiveawayPhase('closed', 'Manual', true), true);
  assert.equal(tier.viewerActsOnGiveawayPhase('closed', 'Manual', false), false);
  assert.equal(tier.viewerActsOnGiveawayPhase('closed', 'Random', true), false);
  assert.equal(tier.viewerActsOnGiveawayPhase('closed', 'FirstCome', true), false);
  for (const p of ['upcoming', 'open', 'full', 'pickup', 'finished'])
    assert.equal(tier.viewerActsOnGiveawayPhase(p, 'Manual', true), false);
});

test('admin: only cases awaiting the admin are act now', () => {
  const act = (l) => tier.badgePaint(l.tone, l.lifecycle, l.adminActs);
  assert.equal(act(adminLabels.ADMIN_REPORT_STATUS.Pending), 'act-warning');
  assert.equal(act(adminLabels.ADMIN_APPEAL_STATUS.Pending), 'act-warning');
  for (const l of [
    adminLabels.ADMIN_REPORT_STATUS.Under_Investigation,
    adminLabels.ADMIN_REPORT_STATUS.Violation_Confirmed,
    adminLabels.ADMIN_APPEAL_STATUS.Rejected,
    adminLabels.ADMIN_ACCOUNT_STATUS.Suspended,
    adminLabels.ADMIN_ACCOUNT_STATUS.Banned,
    adminLabels.ADMIN_APPOINTMENT_STATUS.Pending,
    ...Object.values(adminLabels.ADMIN_TRANSACTION_STATUS),
  ]) {
    assert.notEqual(act(l), 'act-warning', l.label);
    assert.notEqual(act(l), 'act-danger', l.label);
  }
});

test('a deal clock is act now only for the side that must move', () => {
  const d = tier.viewerActsOnDeadline;
  assert.equal(d('seller-confirm-payment', {}, 'seller', 2), true);
  assert.equal(d('seller-confirm-payment', {}, 'buyer', 1), false);
  assert.equal(d('refund-confirmation', {}, 'buyer', 1), true);
  assert.equal(d('refund-confirmation', {}, 'seller', 2), false);
  for (const k of ['cancel-response', 'return-response']) {
    assert.equal(d(k, { cancellation_requested_by: 1 }, 'buyer', 1), false);
    assert.equal(d(k, { cancellation_requested_by: 1 }, 'seller', 2), true);
    assert.equal(d(k, { cancellation_requested_by: null }, 'seller', 2), false);
  }
  for (const k of ['seller-ship', 'giveaway-registration', 'giveaway-pickup', 'ticket-rotation'])
    assert.equal(d(k, {}, 'seller', 2), false);
});
