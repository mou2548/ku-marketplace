import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

class Redirect extends Error {
  constructor(to) {
    super(to);
    this.to = to;
  }
}

async function loginAs(user, email = 'someone@ku.th', sent = {}, returnTo) {
  const { login } = loadTs('lib/actions/auth.ts', {
    'next/navigation': {
      redirect: (to) => {
        throw new Redirect(to);
      },
    },
    '@/lib/api/auth': {
      login: async (to) => {
        sent.email = to;
        return {
          accessToken: 'a',
          refreshToken: 'r',
          sessionExpiresAt: 0,
          user,
        };
      },
    },
    '@/lib/auth-rules': loadTs('lib/auth-rules.ts'),
    '@/lib/api/client': { ApiError: class ApiError extends Error {} },
    '@/lib/api-errors': { errorText: (err) => err.message },
    '@/lib/api/session': {
      setSession: async () => {},
      clearSession: async () => {},
      getRefreshToken: async () => undefined,
    },
  });
  const form = new FormData();
  form.set('email', email);
  form.set('password', 'secret');
  if (returnTo !== undefined) form.set('returnTo', returnTo);
  try {
    await login(undefined, form);
  } catch (error) {
    if (error instanceof Redirect) return error.to;
    throw error;
  }
  assert.fail('expected a redirect');
}

test('an admin lands on the admin dashboard', async () => {
  assert.equal(await loginAs({ status: 'Active', isAdmin: true }), '/admin');
});

test('a student lands on the feed', async () => {
  assert.equal(await loginAs({ status: 'Active', isAdmin: false }), '/feed');
});

test('a suspended or banned account lands on its appeals', async () => {
  for (const status of ['Suspended', 'Banned'])
    assert.equal(await loginAs({ status, isAdmin: false }), '/account/appeals');
});

test('the email is trimmed, but its case is kept, before it is sent', async () => {
  const sent = {};
  await loginAs({ status: 'Active', isAdmin: false }, '  User1@ku.th ', sent);
  assert.equal(sent.email, 'User1@ku.th');
});

const rules = loadTs('lib/auth-rules.ts');
const student = { status: 'Active', isAdmin: false };

test('login returns to the page that sent the visitor there, query included', async () => {
  for (const path of ['/history/1', '/chat/12?tab=deal', '/sellers/4', '/account/edit', '/admin/reports?status=open'])
    assert.equal(await loginAs(student, undefined, {}, path), path);
});

test('an admin also follows returnTo; a restricted account still lands on its appeals', async () => {
  assert.equal(await loginAs({ status: 'Active', isAdmin: true }, undefined, {}, '/history/3'), '/history/3');
  assert.equal(await loginAs({ status: 'Banned', isAdmin: false }, undefined, {}, '/history/3'), '/account/appeals');
});

const unsafe = [
  '//evil.com',
  '//evil.com/path',
  '/\\evil.com',
  '/\\/evil.com',
  '\\evil.com',
  'https://evil.com',
  'http:/evil.com',
  'javascript:alert(1)',
  'evil.com',
  '/\t/evil.com',
  '/\n/evil.com',
  '/ /evil.com',
  '/history/1\\..\\..\\evil.com',
  '/login',
  '/login?returnTo=/feed',
  '/LOGIN',
  '/verify?email=a@ku.th',
  '/reset',
  '/forgot',
  '/register',
  '/api/session',
  '/' + 'a'.repeat(2048),
  '',
];

test('login ignores an unsafe or looping returnTo and falls back to the role home', async () => {
  for (const value of unsafe) {
    assert.equal(rules.safeReturnTo(value), undefined, JSON.stringify(value));
    assert.equal(await loginAs(student, undefined, {}, value), '/feed', JSON.stringify(value));
  }
});

test('safeReturnTo accepts same-origin paths and rejects non-strings', () => {
  for (const value of ['/', '/feed', '/history/1?x=%2F%2Fevil.com', '/market/9#photos', '/loginx'])
    assert.equal(rules.safeReturnTo(value), value);
  for (const value of [undefined, null, 1, ['/feed']])
    assert.equal(rules.safeReturnTo(value), undefined);
});

test('loginHref carries a safe returnTo and drops an unsafe one', () => {
  assert.equal(rules.loginHref('/chat/1?tab=deal'), '/login?returnTo=%2Fchat%2F1%3Ftab%3Ddeal');
  assert.equal(rules.loginHref('//evil.com'), '/login');
  assert.equal(rules.loginHref(null), '/login');
});

test('only the signed-in areas require a session', () => {
  for (const path of ['/account', '/account/edit', '/admin', '/admin/users/3', '/chat/1', '/history', '/inventory/new', '/offers/2'])
    assert.equal(rules.requiresSignIn(path), true, path);
  for (const path of ['/', '/feed', '/market/1', '/sellers/4', '/giveaway', '/login', '/accounts', '/chatroom'])
    assert.equal(rules.requiresSignIn(path), false, path);
});
