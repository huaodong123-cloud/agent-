const form = document.querySelector('#guide-form');
const agentsEl = document.querySelector('#agents');
const workflowEl = document.querySelector('#workflow');
const guideEl = document.querySelector('#guide');
const issuesEl = document.querySelector('#issues');
const scoreEl = document.querySelector('#score');
const runStatusEl = document.querySelector('#run-status');
const sampleButton = document.querySelector('#sample-button');
const copyButton = document.querySelector('#copy-button');

let latestGuideText = '';

const sample = {
  apiKey: 'sk-demo-not-sent-to-storage',
  gameName: 'Example RPG',
  progress: 'Level 42, chapter 5',
  resources: 'Two healers, mid-tier gear, 40 minutes per day',
  stuckPoint: 'Cannot beat the fire boss shield phase',
  target: 'Clear the boss this week'
};

function formDataToObject() {
  return Object.fromEntries(new FormData(form).entries());
}

function renderAgents(agents = []) {
  agentsEl.innerHTML = agents.map((agent) => `
    <details class="agent-card" open>
      <summary>
        <strong>${agent.name}</strong>
        <span class="status">${agent.status}</span>
      </summary>
      <pre>${escapeHtml(JSON.stringify(agent.output, null, 2))}</pre>
    </details>
  `).join('');
}

function renderWorkflow(stages = []) {
  workflowEl.innerHTML = stages.map((stage) => `
    <li>
      <strong>${stage.name}</strong>
      <span class="status">${stage.status}</span>
    </li>
  `).join('');
}

function renderGuide(guide) {
  if (!guide) {
    latestGuideText = '';
    guideEl.className = 'guide-output empty';
    guideEl.textContent = '等待一次规划运行。';
    return;
  }

  latestGuideText = [
    `诊断：${guide.diagnosis}`,
    `步骤：${guide.steps.join(' / ')}`,
    `配装：${guide.buildAdvice}`,
    `路线：${guide.routePlan}`,
    `风险：${guide.risks.join(' / ')}`
  ].join('\n');

  guideEl.className = 'guide-output';
  guideEl.innerHTML = `
    <section>
      <h3>现状诊断</h3>
      <p>${escapeHtml(guide.diagnosis)}</p>
    </section>
    <section>
      <h3>执行步骤</h3>
      <ul>${guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ul>
    </section>
    <section>
      <h3>Build</h3>
      <p>${escapeHtml(guide.buildAdvice)}</p>
    </section>
    <section>
      <h3>路线</h3>
      <p>${escapeHtml(guide.routePlan)}</p>
    </section>
    <section>
      <h3>风险</h3>
      <ul>${guide.risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join('')}</ul>
    </section>
  `;
}

function renderHarness(harness) {
  if (!harness) {
    scoreEl.textContent = '--';
    issuesEl.innerHTML = '';
    return;
  }

  scoreEl.textContent = `${harness.total}/100`;
  issuesEl.innerHTML = harness.issues.length
    ? harness.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')
    : '<li>未发现阻断问题</li>';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

sampleButton.addEventListener('click', () => {
  for (const [key, value] of Object.entries(sample)) {
    form.elements[key].value = value;
  }
});

copyButton.addEventListener('click', async () => {
  if (!latestGuideText) return;
  await navigator.clipboard.writeText(latestGuideText);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  runStatusEl.textContent = 'running';
  renderAgents([]);
  renderWorkflow([{ name: 'Intake', status: 'running' }]);
  renderGuide(null);
  renderHarness(null);

  const response = await fetch('/api/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(formDataToObject())
  });

  const run = await response.json();
  runStatusEl.textContent = run.status;

  if (!response.ok) {
    issuesEl.innerHTML = (run.errors || ['请求失败']).map((error) => `<li>${escapeHtml(error)}</li>`).join('');
    return;
  }

  renderAgents(run.agents);
  renderWorkflow(run.workflow);
  renderGuide(run.finalGuide);
  renderHarness(run.harness);
});
