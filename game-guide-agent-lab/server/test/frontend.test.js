import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('keeps api key in a separate settings form', async () => {
  const html = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
  const settingsStart = html.indexOf('id="settings-form"');
  const guideStart = html.indexOf('id="guide-form"');

  assert.notEqual(settingsStart, -1);
  assert.notEqual(guideStart, -1);
  assert.equal(settingsStart < guideStart, true);

  const settingsSection = html.slice(settingsStart, guideStart);
  const guideSection = html.slice(guideStart);

  assert.match(settingsSection, /name="apiKey"/);
  assert.doesNotMatch(guideSection, /name="apiKey"/);
});

test('submits guide input by merging settings api key in app script', async () => {
  const script = await readFile(new URL('../../web/app.js', import.meta.url), 'utf8');

  assert.match(script, /const settingsForm = document\.querySelector\('#settings-form'\)/);
  assert.match(script, /apiKey: new FormData\(settingsForm\)\.get\('apiKey'\)/);
});
