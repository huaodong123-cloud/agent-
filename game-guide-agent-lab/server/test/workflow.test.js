import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuideRun } from '../src/workflow.js';
import { MODEL_ID } from '../src/config.js';

test('creates a completed mock run with agents, workflow stages, and harness score', async () => {
  const run = await createGuideRun({
    apiKey: 'sk-test',
    gameName: 'Example RPG',
    progress: 'Level 42',
    resources: 'Two healers, mid-tier gear',
    stuckPoint: 'Cannot beat the fire boss',
    target: 'Clear the boss this week'
  });

  assert.equal(run.model, MODEL_ID);
  assert.equal(run.status, 'completed');
  assert.equal(run.agents.length, 7);
  assert.equal(run.workflow.length, 8);
  assert.equal(run.harness.total > 0, true);
  assert.equal(typeof run.finalGuide.diagnosis, 'string');
});
