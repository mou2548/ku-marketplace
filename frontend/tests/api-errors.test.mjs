import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const copy = loadTs('lib/copy.ts');
const { errorText } = loadTs(
  'lib/api-errors.ts',
  { '@/lib/api/client': { ApiError }, '@/lib/copy': copy },
  { TypeError },
);

test('known Thai API messages become English copy', () => {
  assert.equal(errorText(new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')), 'Wrong email or password.');
  assert.equal(
    errorText(new ApiError(409, 'กรุณาตั้งค่า PromptPay ในโปรไฟล์ก่อนลงขายสินค้า')),
    'Add your PromptPay number in your profile before selling.',
  );
});

test('captured values are passed into the copy', () => {
  assert.equal(
    errorText(new ApiError(400, 'ลดจำนวนได้ต่ำสุด 3 ชิ้น เพราะขายหรือแลกไปแล้วเท่านั้นในโพสต์นี้')),
    'Quantity cannot go below 3, the number already sold or traded.',
  );
});

test('English 4xx messages pass through; unknown Thai falls back by status', () => {
  assert.equal(
    errorText(new ApiError(409, 'An offered item is no longer available')),
    'An offered item is no longer available',
  );
  assert.equal(errorText(new ApiError(400, 'item_id ไม่ถูกต้อง')), 'That did not go through. Check the details and try again.');
  assert.equal(errorText(new ApiError(500, 'Internal server error')), 'Something went wrong on our side. Try again in a moment.');
});

test('missing session and network failures have their own messages', () => {
  assert.equal(errorText(new Error('Not signed in')), 'Your session has ended. Sign in again.');
  assert.equal(errorText(new TypeError('fetch failed')), 'Could not reach the server. Try again.');
  assert.equal(errorText(new Error('boom')), 'Something went wrong. Try again.');
});

test('PromptPay refusals say who has to act', () => {
  assert.equal(
    errorText(new ApiError(409, 'ผู้ขายยังไม่ได้ตั้งค่า PromptPay จึงยังซื้อสินค้านี้ไม่ได้')),
    'The seller has not set up PromptPay yet, so this item cannot be bought right now.',
  );
  assert.equal(
    errorText(new ApiError(409, 'กรุณาตั้งค่า PromptPay ในโปรไฟล์ก่อนรับข้อเสนอที่มีเงินเพิ่ม')),
    'Add your PromptPay number in your profile before accepting an offer with extra cash.',
  );
});

test('developer-facing English and token errors fall back by status', () => {
  assert.equal(errorText(new ApiError(400, 'price is required for SellOnly and Both')), 'That did not go through. Check the details and try again.');
  assert.equal(errorText(new ApiError(400, 'description must be shorter than or equal to 2000 characters')), 'That did not go through. Check the details and try again.');
  assert.equal(errorText(new ApiError(401, 'Invalid token')), 'Your session has ended. Sign in again.');
});

test('only fetch failures count as network errors', () => {
  assert.equal(errorText(new TypeError('Cannot read properties of undefined')), 'Something went wrong. Try again.');
  assert.equal(errorText(new TypeError('Failed to fetch')), 'Could not reach the server. Try again.');
});
