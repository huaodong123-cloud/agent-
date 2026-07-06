# Game Guide Agent Lab

A small multi-agent workflow demo for game guides. The side-panel frontend asks the user for a DeepSeek API key and game situation, then shows a mock run with research, state analysis, build planning, route planning, combat advice, critique, synthesis, and harness scoring.

The scaffold locks the model id to `deepseek-v4`, but does not call DeepSeek yet. The backend keeps the model id and API key flow in place so a real provider adapter can be added later.

## Run

```powershell
npm test
npm start
```

Open:

```text
http://localhost:5177
```

## Project Structure

```text
game-guide-agent-lab/
  server/
    src/
      config.js
      harness.js
      server.js
      validation.js
      workflow.js
    test/
      harness.test.js
      validation.test.js
      workflow.test.js
  web/
    app.js
    index.html
    styles.css
```

## Current Scope

- User enters API key in the side tool.
- API key is used for request validation but is not stored.
- Model id is fixed as `deepseek-v4`.
- Workflow is visible and completed with mock agent outputs.
- Harness validates structure and scores the final guide.
- Real live research and DeepSeek calls are intentionally left for the next implementation step.
