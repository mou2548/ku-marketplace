import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { REPORT_DETAILS_MIN, isReportDetailsValid } = loadTs('lib/report-rules.ts');

test('a report needs at least 10 characters of details', () => {
  assert.equal(REPORT_DETAILS_MIN, 10);
  assert.equal(isReportDetailsValid(''), false);
  assert.equal(isReportDetailsValid('too short'), false);
  assert.equal(isReportDetailsValid('0123456789'), true);
});

test('spaces around the text do not count towards the minimum', () => {
  assert.equal(isReportDetailsValid('   short   '), false);
  assert.equal(isReportDetailsValid(' '.repeat(30)), false);
  assert.equal(isReportDetailsValid('  0123456789  '), true);
});
