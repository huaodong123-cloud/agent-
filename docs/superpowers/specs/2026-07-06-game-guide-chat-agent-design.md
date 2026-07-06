# Game Guide Chat Agent Design

## Goal

Upgrade Game Guide Agent Lab from a form-based guide generator into a local, side-panel chat assistant inspired by Jarvis-style interaction. The user enters a personal DeepSeek API key at startup, then chats with either a chief guide agent or a specific specialist agent.

The app is locally deployed. There is no account system. The login window is only for configuring the user's own API key.

## First-Run Login Window

The first screen must be a login-style API key window.

Required behavior:

- Show a compact login panel before the chat workspace.
- Ask for the user's DeepSeek API key.
- Explain that this is a local deployment and the key is the user's own key.
- Do not ask for username, password, email, or account registration.
- Do not persist the API key to the server or to disk.
- Store the API key only in browser memory for the current session.
- After successful local validation, enter the chat workspace.

Validation:

- Empty API key blocks entry.
- Non-empty API key allows entry.
- Real provider validation can be added later, but the first version only checks presence.

## Settings After Login

After entering the chat workspace, the user can open settings from the side tool.

Settings include:

- DeepSeek API key, editable.
- Model id, locked to `deepseek-v4` for now.
- Research source priority, fixed as Bilibili first, Xiaoheihe second for the first version.

The settings entry should be easy to find but should not dominate the chat UI.

## Chat Workspace

The main interaction is chat, not a long planning form.

Layout:

- Top bar: current agent, model id, settings button.
- Agent selector: chief guide plus specialist agents.
- Chat stream: user messages, agent messages, research cards, harness warnings.
- Composer: one text input with send button.
- Optional compact status row: current stage, research status, confidence.

The UI remains a side tool. It should fit beside a game, video, wiki, or notes page.

## Agents

### Chief Guide Agent

Default agent. It decides which specialist agents to involve and produces the final response.

Responsibilities:

- Understand the user's question.
- Ask for missing game context only when necessary.
- Decide whether research is needed.
- Dispatch relevant specialist agents.
- Merge specialist outputs into a clear answer.

### Research Hunter Agent

Finds external guide material.

Priority:

1. Bilibili.
2. Xiaoheihe.
3. Report insufficient sources if both fail.

Responsibilities:

- Search for game name and user question.
- Return concise source summaries.
- Mark source freshness and uncertainty.
- Avoid claiming unsupported facts.

### Mechanics Analyst Agent

Explains game mechanics, boss phases, character systems, or version-specific interactions.

### Build Advisor Agent

Recommends character, gear, skills, loadout, team, or resource upgrades based on user-owned resources.

### Route Planner Agent

Creates farming paths, daily plans, material routes, or progression order.

### Combat Coach Agent

Gives fight plans, rotations, timing, positioning, and common mistake corrections.

### Quality Critic Agent

Checks whether the answer is usable, grounded, and matched to the user's actual situation.

## Agent Knowledge Check

Every agent must first judge whether it knows enough to answer.

Required internal shape:

```json
{
  "confidence": "low | medium | high",
  "needResearch": true,
  "reason": "This question depends on current patch-specific boss mechanics."
}
```

Rules:

- High confidence: answer directly, but still mention assumptions.
- Medium confidence: answer and optionally include uncertainty.
- Low confidence: research before answering.
- If research fails, say what could not be verified instead of fabricating details.

## Research Workflow

When research is needed:

1. Build search queries from game name, user question, and selected agent.
2. Search Bilibili first.
3. Search Xiaoheihe second.
4. Normalize results into source cards.
5. Summarize the useful facts.
6. Answer with source-aware caveats.

Source card shape:

```json
{
  "source": "bilibili | xiaoheihe",
  "title": "Guide title",
  "url": "https://...",
  "summary": "Useful facts from this source",
  "freshness": "unknown | likely-current | possibly-outdated"
}
```

The first version may implement source adapters with best-effort HTTP search. If either site blocks automated access, the adapter returns a clear failure result and the agent exposes that limitation.

## Chat Request Flow

For a user message:

1. Validate API key exists in current session.
2. Read selected agent.
3. Create a chat turn.
4. Run knowledge check.
5. If needed, run research.
6. Generate agent response.
7. Run harness checks.
8. Render response, research cards, and warnings in the chat stream.

Chief guide mode adds one step: it can call multiple specialist agents before final synthesis.

## Harness Checks

The harness checks each answer before display.

Checks:

- API key exists.
- Selected agent is valid.
- Knowledge check exists.
- Low-confidence answer performed research or clearly says research failed.
- If sources are used, source cards include source name, title, URL, and summary.
- Answer addresses the user's actual question.
- Answer includes assumptions or risks when data is uncertain.
- Chief guide answer identifies which specialist agents were used.

## Backend API

Keep the backend small.

Endpoints:

- `POST /api/chat`: submit a chat message.
- `POST /api/research`: run a research query for testing and future UI use.
- Existing `/api/runs` can remain for compatibility but the chat UI should use `/api/chat`.

`POST /api/chat` input:

```json
{
  "apiKey": "sk-...",
  "agentId": "chief",
  "message": "I am stuck on a boss. What should I do?",
  "gameName": "Example RPG"
}
```

`POST /api/chat` output:

```json
{
  "agentId": "chief",
  "confidence": "low",
  "needResearch": true,
  "usedAgents": ["research", "mechanics", "critic"],
  "sources": [],
  "answer": "A clear chat answer.",
  "harness": {
    "ok": true,
    "warnings": []
  }
}
```

## Frontend Behavior

First screen:

- Login window with API key input.
- Enter button.
- Local deployment note.

After login:

- Show chat workspace.
- Settings can reopen API key configuration.
- Agent selector is always visible.
- User can talk to one specialist or the chief guide.
- Chat messages show whether research happened.
- Research results appear as compact source cards.
- Harness warnings appear under the answer, not as blocking popups.

## Non-Goals

- No user accounts.
- No server-side key storage.
- No permanent chat history in the first version.
- No guaranteed access to protected Bilibili or Xiaoheihe content.
- No video transcription or deep video parsing in the first version.
- No browser extension.

## Testing

Minimum tests:

- Login blocks empty API key.
- Login allows non-empty API key.
- Settings can update API key after login.
- Chat request merges current API key and selected agent.
- Agent knowledge check returns confidence and needResearch.
- Low-confidence chat triggers research.
- Research prioritizes Bilibili before Xiaoheihe.
- Harness warns if low-confidence answer skips research.
- Chief guide response lists used specialist agents.

## Approval Check

This design turns the demo into a chat-first local game guide assistant while preserving the original purpose: make multi-agent, workflow, and harness behavior visible.
