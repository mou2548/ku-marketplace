import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const exports = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('lib/appointment.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  { exports },
);
const { deriveAppointmentView } = exports;

const card = (over) => ({
  appointment_id: 1,
  transaction_id: 1,
  proposed_by: 3,
  proposer: { user_id: 3, name: 'S', isVerified: true },
  date: '2026-09-10',
  time: '12:00:00',
  location: 'x',
  status: 'Pending',
  deleted_at: null,
  created_at: '2026-09-01T00:00:00.000Z',
  ...over,
});

test('no cards -> nothing current', () => {
  const v = deriveAppointmentView([]);
  assert.equal(v.current, undefined);
  assert.equal(v.pending, undefined);
  assert.equal(v.pinned, undefined);
});

test('a live Confirmed card is the current, pinned one', () => {
  const v = deriveAppointmentView([
    card({ appointment_id: 1, status: 'Confirmed', created_at: '2026-09-01T00:00:00.000Z' }),
  ]);
  assert.equal(v.current.appointment_id, 1);
  assert.equal(v.pinned.appointment_id, 1);
  assert.equal(v.pending, undefined);
});

test('declining a proposed change never falls back to the old Confirmed card', () => {
  // Old Confirmed card, retired when the change was proposed; the change was
  // then rejected and retired itself. Nothing is live -> propose a new time.
  const cards = [
    card({ appointment_id: 1, status: 'Confirmed', created_at: '2026-09-01T09:00:00.000Z', deleted_at: '2026-09-02T08:00:00.000Z' }),
    card({ appointment_id: 2, status: 'Rejected', created_at: '2026-09-02T08:00:00.000Z', deleted_at: '2026-09-02T09:00:00.000Z' }),
  ];
  const v = deriveAppointmentView(cards);
  assert.equal(v.current, undefined);
  assert.equal(v.pinned, undefined);
  assert.equal(v.pending, undefined);
});

test('soft-deleting the newest card does not revive an older Confirmed one', () => {
  const cards = [
    card({ appointment_id: 1, status: 'Confirmed', created_at: '2026-09-01T09:00:00.000Z', deleted_at: '2026-09-02T08:00:00.000Z' }),
    card({ appointment_id: 2, status: 'Pending', created_at: '2026-09-02T08:00:00.000Z', deleted_at: '2026-09-02T10:00:00.000Z' }),
  ];
  assert.equal(deriveAppointmentView(cards).current, undefined);
});

test('equal created_at breaks the tie on appointment_id, matching the backend', () => {
  const at = '2026-09-05T00:00:00.000Z';
  const cards = [
    card({ appointment_id: 7, status: 'Confirmed', created_at: at }),
    card({ appointment_id: 12, status: 'Pending', created_at: at }),
  ];
  const v = deriveAppointmentView(cards);
  assert.equal(v.current.appointment_id, 12);
  assert.equal(v.pending.appointment_id, 12);
  assert.equal(v.pinned, undefined);
});

test('a live Pending proposal is current until it is answered', () => {
  const cards = [
    card({ appointment_id: 1, status: 'Confirmed', created_at: '2026-09-01T00:00:00.000Z', deleted_at: '2026-09-02T00:00:00.000Z' }),
    card({ appointment_id: 2, status: 'Pending', created_at: '2026-09-02T00:00:00.000Z', deleted_at: null }),
  ];
  const v = deriveAppointmentView(cards);
  assert.equal(v.current.appointment_id, 2);
  assert.equal(v.pending.appointment_id, 2);
});
