import { MODEL_ID } from './config.js';
import { evaluateGuideRun, validateAgentOutput } from './harness.js';
import { validateGuideInput } from './validation.js';

function completedStage(name) {
  return {
    name,
    status: 'completed',
    timestamp: new Date().toISOString()
  };
}

function passedAgent(id, name, output) {
  const validation = validateAgentOutput(id, output);
  return {
    id,
    name,
    status: validation.ok ? 'passed' : 'warning',
    output,
    errors: validation.errors
  };
}

export async function createGuideRun(input) {
  const validation = validateGuideInput(input);
  if (!validation.ok) {
    return {
      id: `run-${Date.now()}`,
      model: MODEL_ID,
      status: 'failed',
      input,
      errors: validation.errors,
      agents: [],
      workflow: [completedStage('Intake')],
      finalGuide: null,
      harness: null
    };
  }

  const agents = [
    passedAgent('research', 'Research Agent', {
      keyMechanics: ['Identify the mechanic behind the stuck point before changing builds'],
      sourceSummaries: ['Mock research notes are used in this scaffold; live search can replace this step later'],
      unknowns: ['Patch freshness and exact game data are not verified in the scaffold']
    }),
    passedAgent('state', 'State Analyst Agent', {
      strengths: [input.resources || 'User has not listed resources'],
      bottlenecks: [input.stuckPoint || 'Current blocker is not specific'],
      missingInformation: ['Exact enemy stats and patch version']
    }),
    passedAgent('build', 'Build Agent', {
      recommendedBuild: `Use available resources first: ${input.resources || 'not provided'}`,
      alternatives: ['Choose a safer sustain setup if damage is inconsistent'],
      requiredResources: [input.resources || 'Basic current roster and equipment']
    }),
    passedAgent('route', 'Route Agent', {
      nextActions: ['Check mechanic', 'Upgrade key survival item', 'Retry with a clear phase plan'],
      farmingOrder: ['Low-cost upgrades first', 'Mechanic-specific materials second'],
      checkpoints: ['Can survive opening phase', 'Can trigger mechanic counter', 'Can finish safely']
    }),
    passedAgent('combat', 'Combat Agent', {
      fightPlan: `Treat "${input.stuckPoint || 'the blocker'}" as the main mechanic to solve.`,
      commonMistakes: ['Spending burst skills before the punish window', 'Changing every build piece at once'],
      recoveryTips: ['Reset to a safer route if two attempts fail for the same reason']
    }),
    passedAgent('critic', 'Critic Agent', {
      contradictions: [],
      overAssumptions: ['Scaffold mode cannot verify live game patch data'],
      requiredRevisions: []
    })
  ];

  const finalGuide = {
    diagnosis: `${input.progress || 'Current progress'} is blocked by ${input.stuckPoint || 'the current challenge'}.`,
    steps: [
      'Read the key mechanic before changing the whole build',
      `Keep the plan centered on your current resources: ${input.resources || 'not provided'}`,
      'Make one low-cost upgrade, then retry and compare the same phase',
      `Aim for the target: ${input.target || 'clear the next practical milestone'}`
    ],
    buildAdvice: `Base the setup on available resources: ${input.resources || 'not provided'}.`,
    routePlan: `Start with a short prep route, then retry ${input.stuckPoint || 'the blocker'} with one focused change.`,
    risks: ['This scaffold uses mock research, so verify advice against current patch notes before relying on it']
  };

  agents.push(passedAgent('writer', 'Writer Agent', finalGuide));

  const workflow = [
    'Intake',
    'Research',
    'Parallel analysis',
    'Harness validation',
    'Critique',
    'Revision',
    'Synthesis',
    'Scoring'
  ].map(completedStage);

  const harness = evaluateGuideRun({
    input,
    finalGuide,
    criticFindings: agents.find((agent) => agent.id === 'critic')?.output.overAssumptions || []
  });

  return {
    id: `run-${Date.now()}`,
    model: MODEL_ID,
    status: 'completed',
    input,
    agents,
    workflow,
    finalGuide,
    harness,
    errors: []
  };
}
