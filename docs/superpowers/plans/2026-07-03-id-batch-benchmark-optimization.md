# ID Batch Benchmark Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable Go vs Java identity-card batch analysis demo with per-program data views.

**Architecture:** Go and Java expose the same HTTP API and deterministic record model. The frontend keeps the current dashboard, but its Go/Java data tabs query their own service endpoints so each program can display its own analysis output.

**Tech Stack:** Go standard library, Java standard library HTTP server, static HTML/CSS/JavaScript.

---

### Task 1: Backend Record Model And Tests

**Files:**
- Create: `id-verifier-go/main_test.go`
- Create: `id-verifier-java/IdVerifierTest.java`
- Modify: `id-verifier-go/main.go`
- Modify: `id-verifier-java/IdVerifier.java`

- [ ] Write failing tests for deterministic record generation and analysis summaries.
- [ ] Run Go and Java tests and confirm missing functions fail.
- [ ] Implement shared model functions in both languages.
- [ ] Run tests and confirm they pass.

### Task 2: Unified HTTP API

**Files:**
- Modify: `id-verifier-go/main.go`
- Modify: `id-verifier-java/IdVerifier.java`

- [ ] Add `/generate`, `/analyze`, `/summary`, and `/records` while preserving `/start` compatibility.
- [ ] Make `/records?page=1&pageSize=50&gender=all&valid=all&q=` return paged records for that program.
- [ ] Compile both services.

### Task 3: Frontend Integration

**Files:**
- Modify: `id-verifier-frontend/app.js`
- Modify: `id-verifier-frontend/index.html`

- [ ] Keep Go and Java tabs independent.
- [ ] Fetch Go tab records from `http://localhost:8090/records`.
- [ ] Fetch Java tab records from `http://localhost:8091/records`.
- [ ] Preserve deterministic fallback when services are not running.

### Task 4: Verification

**Files:**
- Use existing project files.

- [ ] Run Go tests.
- [ ] Compile Java and run Java assertions.
- [ ] Run frontend JavaScript syntax check.
- [ ] Generate a screenshot of the final prototype.
