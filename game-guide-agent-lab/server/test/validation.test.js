import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGuideInput } from '../src/validation.js';

test('rejects missing api key and game name', () => {
  const result = validateGuideInput({ apiKey: '', gameName: '' });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ['API key is required', 'Game name is required']);
});

test('accepts a complete guide request', () => {
  const result = validateGuideInput({
    apiKey: 'sk-test',
    gameName: 'Example RPG',
    progress: 'Level 42',
    resources: 'Two healers, mid-tier gear',
    stuckPoint: 'Cannot beat the fire boss',
    target: 'Clear the boss this week'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});
