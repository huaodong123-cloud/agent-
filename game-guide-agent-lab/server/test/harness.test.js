import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGuideRun, validateAgentOutput } from '../src/harness.js';

test('rejects agent output that is missing required fields', () => {
  const result = validateAgentOutput('research', { keyMechanics: ['boss has shield'] });

  assert.equal(result.ok, false);
  assert.equal(result.errors.includes('research.sourceSummaries is required'), true);
});

test('scores a final guide between 0 and 100', () => {
  const result = evaluateGuideRun({
    input: {
      progress: 'Level 42',
      resources: 'Two healers, mid-tier gear',
      stuckPoint: 'Cannot beat the fire boss'
    },
    finalGuide: {
      diagnosis: 'Your mid-tier gear is enough, but the fire shield phase is the bottleneck.',
      steps: ['Equip fire resistance', 'Save burst skills for shield break'],
      buildAdvice: 'Use one healer and one shield breaker from your current roster.',
      routePlan: 'Farm resistance materials before retrying.',
      risks: ['If you lack resistance gear, delay the attempt by one day']
    },
    criticFindings: []
  });

  assert.equal(result.total >= 0, true);
  assert.equal(result.total <= 100, true);
  assert.equal(result.issues.length, 0);
});
