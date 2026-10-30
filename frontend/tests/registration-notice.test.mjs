import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { registrationTitle, registrationBody, grantTitle } = loadTs('lib/registration-notice.ts');

test('the title carries the count, so a new registration is a new notification', () => {
  assert.equal(registrationTitle(1, 'GG'), '1 person registered: GG');
  assert.equal(registrationTitle(3, 'GG'), '3 people registered: GG');
  assert.notEqual(registrationTitle(2, 'GG'), registrationTitle(3, 'GG'));
});

test('the body names up to three people, then counts the rest', () => {
  assert.equal(registrationBody(['Somchai']), 'Somchai.');
  assert.equal(registrationBody(['Somchai', 'Somsri']), 'Somchai and Somsri.');
  assert.equal(registrationBody(['A', 'B', 'C']), 'A, B and C.');
  assert.equal(registrationBody(['A', 'B', 'C', 'D', 'E']), 'A, B, C and 2 more.');
  assert.equal(registrationBody([]), '');
});

test('places given read the same way, and the count is in the title', () => {
  assert.equal(grantTitle(1, 'GG'), '1 person got a place: GG');
  assert.equal(grantTitle(2, 'GG'), '2 people got a place: GG');
});
