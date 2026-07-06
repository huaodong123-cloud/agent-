const REQUIRED_FIELDS = {
  research: ['keyMechanics', 'sourceSummaries', 'unknowns'],
  state: ['strengths', 'bottlenecks', 'missingInformation'],
  build: ['recommendedBuild', 'alternatives', 'requiredResources'],
  route: ['nextActions', 'farmingOrder', 'checkpoints'],
  combat: ['fightPlan', 'commonMistakes', 'recoveryTips'],
  critic: ['contradictions', 'overAssumptions', 'requiredRevisions'],
  writer: ['diagnosis', 'steps', 'buildAdvice', 'routePlan', 'risks']
};

export function validateAgentOutput(agentId, output = {}) {
  const errors = [];

  for (const field of REQUIRED_FIELDS[agentId] || []) {
    if (!(field in output)) {
      errors.push(`${agentId}.${field} is required`);
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function evaluateGuideRun({ input = {}, finalGuide = {}, criticFindings = [] }) {
  const issues = [];
  const guideText = JSON.stringify(finalGuide).toLowerCase();
  const resources = String(input.resources || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (resources.length > 0 && !resources.some((resource) => guideText.includes(resource.toLowerCase()))) {
    issues.push('Guide does not clearly reference user resources');
  }

  if (!Array.isArray(finalGuide.steps) || finalGuide.steps.length === 0) {
    issues.push('Guide has no concrete steps');
  }

  if (!Array.isArray(finalGuide.risks) || finalGuide.risks.length === 0) {
    issues.push('Guide has no risk notes');
  }

  for (const finding of criticFindings) {
    if (finding) {
      issues.push(String(finding));
    }
  }

  return {
    total: Math.max(0, 100 - issues.length * 12),
    dimensions: {
      researchCoverage: issues.length ? 18 : 23,
      situationMatch: issues.length ? 17 : 24,
      actionability: issues.length ? 18 : 23,
      riskControl: issues.length ? 10 : 14,
      outputStructure: issues.length ? 8 : 10
    },
    issues
  };
}
