export function validateGuideInput(input = {}) {
  const errors = [];

  if (!String(input.apiKey || '').trim()) {
    errors.push('API key is required');
  }

  if (!String(input.gameName || '').trim()) {
    errors.push('Game name is required');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
