import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

class Redirect extends Error {
  constructor(to) {
    super(to);
    this.to = to;
  }
}

async function loginAs(user, email = 'someone@ku.th', sent = {}) {
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
