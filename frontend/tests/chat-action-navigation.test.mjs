import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

// Exercise the actual transition handler without mounting unrelated chat UI.
const file = ts.createSourceFile('room-screen.tsx', fs.readFileSync('app/(app)/chat/[roomId]/room-screen.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'act') handler = node.getText(file);
  ts.forEachChild(node, visit);
}
visit(file);
assert.ok(handler);
const code = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;

function setup(pathname, roomId) {
  const navigations = [];
  const floated = [];
  const context = {
    pathname, summary: { room_id: roomId }, setBusy: () => {},
    toast: { success: () => {}, error: () => {} },
    // Every status change routes through `act`, and each one has to float the
    // room in the inbox the way a sent message does.
    markRoomActive: (id) => floated.push(id),
    router: Object.fromEntries(['push', 'replace', 'refresh'].map(method => [method, (...args) => navigations.push([method, ...args])])),
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { act: context.act, navigations, floated };
}

test('accepting from the inbox pins the current room instead of refreshing the sorted preview', async () => {
  const x = setup('/chat', 42);
  await x.act(async () => {}, 'Accepted', 'Failed');
  assert.deepEqual(x.navigations, [['replace', '/chat/42']]);
  assert.deepEqual(x.floated, [42]);
});

test('accepting inside a room refreshes that room', async () => {
  const x = setup('/chat/42', 42);
  await x.act(async () => {}, 'Accepted', 'Failed');
  assert.deepEqual(x.navigations, [['refresh']]);
});

test('a status change floats its room, and a failed one does not', async () => {
  const x = setup('/chat/42', 42);
  await x.act(async () => {}, 'Accepted', 'Failed');
  assert.deepEqual(x.floated, [42]);
  await x.act(async () => { throw new Error('Rejected'); }, 'Accepted', 'Failed');
  assert.deepEqual(x.floated, [42]);
});

test('failed acceptance stays in place and explicit next destinations remain supported', async () => {
  const x = setup('/chat', 42);
  await x.act(async () => { throw new Error('Rejected'); }, 'Accepted', 'Failed');
  assert.deepEqual(x.navigations, []);
  await x.act(async () => {}, 'Accepted', 'Failed', '/history');
  assert.deepEqual(x.navigations, [['push', '/history']]);
});
