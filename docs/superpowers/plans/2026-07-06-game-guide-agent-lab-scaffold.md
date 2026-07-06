# Game Guide Agent Lab Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a small runnable project folder for the game guide multi-agent workflow demo.

**Architecture:** Use a dependency-free Node.js backend for workflow contracts, validation, harness scoring, and mock orchestration. Use a static side-panel frontend that calls the backend and displays input, agent states, workflow stages, final guide, and harness score.

**Tech Stack:** Node.js built-in `http`, `node:test`, static HTML/CSS/JavaScript.

---

## File Structure

- Create: `game-guide-agent-lab/README.md` - project overview and commands.
- Create: `game-guide-agent-lab/package.json` - scripts for tests and server.
- Create: `game-guide-agent-lab/server/src/config.js` - model id constant.
- Create: `game-guide-agent-lab/server/src/validation.js` - user input validation.
- Create: `game-guide-agent-lab/server/src/harness.js` - output validation and scoring.
- Create: `game-guide-agent-lab/server/src/workflow.js` - mock multi-agent workflow orchestration.
- Create: `game-guide-agent-lab/server/src/server.js` - HTTP API and static file server.
- Create: `game-guide-agent-lab/server/test/validation.test.js` - validation tests.
- Create: `game-guide-agent-lab/server/test/harness.test.js` - harness tests.
- Create: `game-guide-agent-lab/server/test/workflow.test.js` - workflow tests.
- Create: `game-guide-agent-lab/web/index.html` - side-panel UI.
- Create: `game-guide-agent-lab/web/styles.css` - compact side-tool styling.
- Create: `game-guide-agent-lab/web/app.js` - frontend state and API calls.

## Tasks

### Task 1: Create Tests First

**Files:**
- Create: `game-guide-agent-lab/package.json`
- Create: `game-guide-agent-lab/server/test/validation.test.js`
- Create: `game-guide-agent-lab/server/test/harness.test.js`
- Create: `game-guide-agent-lab/server/test/workflow.test.js`

- [ ] **Step 1: Add scripts**

```json
{
  "name": "game-guide-agent-lab",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test server/test/*.test.js",
    "start": "node server/src/server.js"
  }
}
```

- [ ] **Step 2: Add failing validation tests**

```javascript
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
```

- [ ] **Step 3: Add failing harness tests**

```javascript
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
```

- [ ] **Step 4: Add failing workflow test**

```javascript
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
```

- [ ] **Step 5: Run tests and verify red**

Run: `npm test`

Expected: tests fail because `server/src/*.js` files do not exist.

### Task 2: Add Minimal Backend Modules

**Files:**
- Create: `game-guide-agent-lab/server/src/config.js`
- Create: `game-guide-agent-lab/server/src/validation.js`
- Create: `game-guide-agent-lab/server/src/harness.js`
- Create: `game-guide-agent-lab/server/src/workflow.js`

- [ ] **Step 1: Add config**

```javascript
export const MODEL_ID = 'deepseek-v4';
```

- [ ] **Step 2: Add validation**

```javascript
export function validateGuideInput(input = {}) {
  const errors = [];
  if (!String(input.apiKey || '').trim()) errors.push('API key is required');
  if (!String(input.gameName || '').trim()) errors.push('Game name is required');
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 3: Add harness**

```javascript
const REQUIRED_FIELDS = {
  research: ['keyMechanics', 'sourceSummaries', 'unknowns']
};

export function validateAgentOutput(agentId, output = {}) {
  const errors = [];
  for (const field of REQUIRED_FIELDS[agentId] || []) {
    if (!(field in output)) errors.push(`${agentId}.${field} is required`);
  }
  return { ok: errors.length === 0, errors };
}

export function evaluateGuideRun({ input, finalGuide, criticFindings = [] }) {
  const issues = [];
  const text = JSON.stringify(finalGuide).toLowerCase();
  if (!text.includes(String(input.resources || '').split(',')[0].trim().toLowerCase())) {
    issues.push('Guide does not clearly reference user resources');
  }
  if (!finalGuide.steps?.length) issues.push('Guide has no concrete steps');
  if (!finalGuide.risks?.length) issues.push('Guide has no risk notes');
  for (const finding of criticFindings) issues.push(finding);

  const total = Math.max(0, 100 - issues.length * 12);
  return { total, issues };
}
```

- [ ] **Step 4: Add workflow**

```javascript
import { MODEL_ID } from './config.js';
import { evaluateGuideRun } from './harness.js';
import { validateGuideInput } from './validation.js';

export async function createGuideRun(input) {
  const validation = validateGuideInput(input);
  if (!validation.ok) {
    return { status: 'failed', errors: validation.errors };
  }

  const agents = [
    { id: 'research', name: 'Research Agent', status: 'passed' },
    { id: 'state', name: 'State Analyst Agent', status: 'passed' },
    { id: 'build', name: 'Build Agent', status: 'passed' },
    { id: 'route', name: 'Route Agent', status: 'passed' },
    { id: 'combat', name: 'Combat Agent', status: 'passed' },
    { id: 'critic', name: 'Critic Agent', status: 'passed' },
    { id: 'writer', name: 'Writer Agent', status: 'passed' }
  ];

  const workflow = ['Intake', 'Research', 'Parallel analysis', 'Harness validation', 'Critique', 'Revision', 'Synthesis', 'Scoring']
    .map((name) => ({ name, status: 'completed' }));

  const finalGuide = {
    diagnosis: `${input.progress || 'Current progress'} is blocked by ${input.stuckPoint || 'the current challenge'}.`,
    steps: ['Review the core mechanic', 'Adjust build around available resources', 'Retry with the safer route'],
    buildAdvice: `Base the setup on available resources: ${input.resources || 'not provided'}.`,
    routePlan: `Focus on ${input.target || 'the next clear'} with one short farming pass first.`,
    risks: ['Advice is generated from the current prompt and should be checked against recent game changes']
  };

  const harness = evaluateGuideRun({ input, finalGuide, criticFindings: [] });
  return { id: `run-${Date.now()}`, model: MODEL_ID, status: 'completed', input, agents, workflow, finalGuide, harness };
}
```

- [ ] **Step 5: Run tests and verify green**

Run: `npm test`

Expected: all tests pass.

### Task 3: Add Side Tool UI And Server

**Files:**
- Create: `game-guide-agent-lab/server/src/server.js`
- Create: `game-guide-agent-lab/web/index.html`
- Create: `game-guide-agent-lab/web/styles.css`
- Create: `game-guide-agent-lab/web/app.js`
- Create: `game-guide-agent-lab/README.md`

- [ ] **Step 1: Add HTTP server**

Create a small HTTP server that serves static files and handles `POST /api/runs`.

- [ ] **Step 2: Add side-panel HTML**

Create a single-page side tool with API key, game situation fields, agent lane, workflow timeline, guide output, and harness score.

- [ ] **Step 3: Add compact CSS**

Style the tool as a 420-520px side panel on desktop and full width on mobile.

- [ ] **Step 4: Add frontend JavaScript**

Call `POST /api/runs`, render agent cards, workflow stages, final guide, and harness report.

- [ ] **Step 5: Add README**

Document `npm test`, `npm start`, and `http://localhost:5177`.

### Task 4: Verify Scaffold

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: Run tests**

Run: `npm test`

Expected: pass.

- [ ] **Step 2: Check JavaScript syntax**

Run: `node --check server/src/server.js`

Expected: no output and exit code 0.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-06-game-guide-agent-lab-scaffold.md game-guide-agent-lab
git commit -m "feat: scaffold game guide agent lab"
```

## Self-Review

- Spec coverage: project folder, API key input, `deepseek-v4`, side tool UI, agents, workflow, and harness are covered.
- Placeholder scan: no TBD/TODO/fill-in placeholders are intentionally left.
- Type consistency: tests and modules use `validateGuideInput`, `validateAgentOutput`, `evaluateGuideRun`, `createGuideRun`, and `MODEL_ID` consistently.
