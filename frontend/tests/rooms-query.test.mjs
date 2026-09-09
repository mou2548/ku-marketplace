import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

class ApiError extends Error { constructor(status) { super(`HTTP ${status}`); this.status = status; } }
function query({ status = 'Expired', failure } = {}) {
  const calls = [];
  const exports = {};
  const dependencies = {
    './client': { ApiError },
    '@/lib/api/chat': {},
    '@/lib/api/giveaways': {
      getGiveaways: async () => [{ giveaway_id: 1, giver_id: 3 }],
      getMyTicket: async () => ({ status }),
      getGiveawayMessages: async (id) => { calls.push(id); if (failure) throw failure; return { roomId: 1, messages: [] }; },
    },
    '@/lib/api/transactions': { getTransactions: async () => [] },
    '@/lib/appointment': {},
    '@/lib/rooms': { buildRooms: ({ giveawayRooms }) => giveawayRooms },
    '@/lib/status': {},
  };
  const source = ts.transpileModule(fs.readFileSync('lib/api/rooms-query.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name] });
  return { run: () => exports.getRoomSummaries(4), calls };
}

test('unselected, forfeited and expired giveaway tickets cannot break the chat inbox', async () => {
  for (const status of ['Registered', 'NotSelected', 'Forfeited', 'Expired']) {
    const q = query({ status });
    assert.equal((await q.run()).length, 0);
    assert.equal(q.calls.length, 0);
  }
});
test('selected recipients see their room and eligibility races omit only the inaccessible room', async () => {
  for (const status of ['Waiting', 'Received']) assert.equal((await query({ status }).run()).length, 1);
  for (const status of [403, 404]) assert.equal((await query({ status: 'Waiting', failure: new ApiError(status) }).run()).length, 0);
  await assert.rejects(query({ status: 'Waiting', failure: new ApiError(500) }).run(), /500/);
});
