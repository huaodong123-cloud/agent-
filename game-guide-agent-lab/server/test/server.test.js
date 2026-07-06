import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { isMainModule, resolveProjectRoot } from '../src/server.js';

test('detects direct execution on Windows style paths', () => {
  const entryPath = 'D:\\workspace\\game-guide-agent-lab\\server\\src\\server.js';
  assert.equal(isMainModule(entryPath, pathToFileURL(entryPath).href), true);
});

test('detects direct execution from a relative script path', () => {
  const entryPath = 'server/src/server.js';
  const moduleUrl = pathToFileURL('D:\\workspace\\game-guide-agent-lab\\server\\src\\server.js').href;
  assert.equal(isMainModule(entryPath, moduleUrl, 'D:\\workspace\\game-guide-agent-lab'), true);
});

test('resolves project root from server module url', () => {
  const entryPath = 'D:\\workspace\\game-guide-agent-lab\\server\\src\\server.js';
  assert.equal(resolveProjectRoot(pathToFileURL(entryPath).href).endsWith('game-guide-agent-lab'), true);
});
