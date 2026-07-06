# Game Guide Agent Lab Design

## Goal

Build a small engineering demo that shows multi-agent, workflow, and harness ideas through a game guide assistant. The user opens a compact side tool, enters a DeepSeek API key and current game situation, then watches multiple agents research, analyze, plan, critique, and produce a usable guide.

The first version should be easy to demo and understand. It should not become a full game database, browser extension, or large content platform.

## Product Shape

The frontend is a side-panel tool instead of a full dashboard. It should feel like a helper that can sit next to a game, wiki, stream, or notes page.

The side tool contains four areas:

1. Input panel: API key, game name, current progress, owned characters or equipment, resources, stuck point, and target.
2. Agent lane: compact status cards for each agent.
3. Workflow timeline: current stage, completed stages, retry or validation states.
4. Final guide and harness report: generated strategy plus quality score.

The UI should prioritize scanability over decoration. The important thing is seeing the workflow move.

## Model And API Key

The user provides the API key in the frontend for each session. The app should not persist the key to disk or local storage in the first version.

The model is locked to `deepseek-v4` for now. Treat this as a configurable model id constant so it can be changed later without redesigning the workflow.

## Input Scenario

The default demo input should be game-neutral but concrete enough to show agent value:

- Game: any user-entered game name.
- Current progress: level, chapter, world, rank, or similar.
- Current resources: characters, weapons, gear, currency, materials, or daily time.
- Stuck point: boss fight, team building, route choice, farming priority, PVP, or early-game confusion.
- Target: clear the stage, improve team, farm efficiently, beat a boss, or prepare for a future patch.

## Agents

### Research Agent

Purpose: collect and summarize useful guide material.

Input: game name, stuck point, target, user situation.

Output:

- key mechanics
- relevant guide notes
- assumptions
- source summaries
- unknowns

The first version may use simulated research or user-provided notes if live web search is not available. The contract should still look like a research step so real search can be added later.

### State Analyst Agent

Purpose: understand the user's actual situation.

Output:

- current strengths
- current bottlenecks
- missing information
- likely reason for being stuck
- priority level for each issue

### Build Agent

Purpose: propose character, equipment, skill, loadout, or build choices based on available resources.

Output:

- recommended build
- alternatives
- required resources
- what to avoid
- upgrade priority

### Route Agent

Purpose: create a practical route or daily plan.

Output:

- next actions
- farming order
- time estimate
- checkpoints
- fallback path

### Combat Agent

Purpose: produce tactical guidance for boss fights, encounters, rotations, or positioning.

Output:

- fight plan
- phase notes
- timing or rotation advice
- common mistakes
- recovery tips

### Critic Agent

Purpose: find weak spots in the proposed plan.

Output:

- contradictions
- over-assumptions
- missing resources
- outdated or uncertain advice
- required revisions

### Writer Agent

Purpose: synthesize the final guide.

Output:

- situation diagnosis
- short-term goal
- step-by-step guide
- build or loadout advice
- combat or route plan
- risk notes
- quick checklist

## Workflow

The workflow is orchestrated as a visible run with clear stages:

1. Intake: validate user fields and create a planning run.
2. Research: ask the Research Agent for guide material or simulated research notes.
3. Parallel analysis: run State Analyst, Build, Route, and Combat agents using the research result.
4. Harness validation: check each agent output against its schema and required fields.
5. Critique: ask the Critic Agent to identify conflicts, missing data, and unrealistic requirements.
6. Revision: if the critic finds severe issues, ask relevant agents for a corrected response.
7. Synthesis: ask the Writer Agent to produce the final guide.
8. Scoring: run the harness scorecard and display the result.

The demo should make these stages visible even if some stages are implemented with mock delays or simple deterministic behavior in the first version.

## Harness

The harness is the quality gate. It does not invent the guide. It checks structure, consistency, and usefulness.

Validation checks:

- API key is present before starting a real model call.
- Model id is `deepseek-v4`.
- Each agent returns parseable structured output.
- Required fields are present for every agent.
- The final guide includes diagnosis, steps, build advice, route or combat plan, and risks.
- The guide references the user's actual progress, resources, and stuck point.
- The plan does not require missing characters, equipment, materials, or time without saying so.
- The plan avoids vague advice such as "just improve your level" without concrete actions.
- Conflicts found by the Critic Agent are either resolved or shown as unresolved risks.

Score dimensions:

- Research coverage: 0-25
- Situation match: 0-25
- Actionability: 0-25
- Risk control: 0-15
- Output structure: 0-10

The final score is displayed as a total out of 100 with a short explanation and issue list.

## Frontend Design

The first screen is the side tool itself, not a landing page.

Layout:

- Fixed or responsive side-panel width around 420-520px on desktop.
- On mobile, it becomes a full-width single-column tool.
- Input fields stay compact.
- Agent cards use small status indicators: idle, running, passed, warning, failed.
- The workflow timeline uses short stage labels and timestamps.
- The final guide is readable markdown-style content inside the tool.
- The harness report is a compact scorecard with issue chips or rows.

Important interactions:

- Start planning
- Stop current run
- Clear input
- Use sample scenario
- Copy final guide
- Expand or collapse each agent output

The UI should not explain multi-agent theory in long text. It should demonstrate the idea through visible agent states and workflow progression.

## Backend Design

Keep the backend small:

- `POST /api/runs`: create a run from user input and API key.
- `GET /api/runs/{id}`: return current workflow state.
- `POST /api/runs/{id}/cancel`: cancel a run.

The backend owns orchestration, model calls, schema validation, and harness scoring. The frontend should not call DeepSeek directly because that would expose request logic and make workflow state harder to control.

Run state should include:

- run id
- input summary
- current stage
- agent statuses
- agent outputs
- critic findings
- final guide
- harness score
- errors

For the first version, in-memory run storage is enough.

## Error Handling

Expected errors:

- missing API key
- model call failure
- invalid agent JSON
- timeout
- harness validation failure
- user cancels run

The side tool should show failures at the stage where they happened. A failed agent should not crash the whole UI. The final guide should only appear when synthesis and scoring finish.

## Testing

Minimum test coverage:

- input validation rejects missing API key and empty game name
- run creation initializes all workflow stages
- harness rejects missing required agent fields
- harness detects a final guide that ignores user resources
- score calculation returns a 0-100 number
- frontend can render idle, running, warning, failed, and completed states

## Non-Goals

- No account system.
- No persistent API key storage.
- No full game database.
- No browser extension in the first version.
- No real-time multiplayer or community guide sharing.
- No guarantee that guide advice is perfectly current.

## Approval Check

This design assumes the first version is an engineering demo: compact, visible, and workflow-first. It should prove the multi-agent pattern before expanding into real search integrations, saved guide history, or game-specific plugins.
