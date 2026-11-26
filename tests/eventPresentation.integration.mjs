// Explicit Docker check: node tests/eventPresentation.integration.mjs
// Isolated test guest; existing user saves are never changed.
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { toServerDecision, toServerHistory } from '../src/game/serverPresentation.ts';
import { createHistoryPlayback, updateSessionHistory, visibleHistory } from '../src/game/historyPlayback.ts';

let cookie = '';
const api = createSessionsApi(createApiClient({
  baseUrl: 'http://127.0.0.1:8081/api',
  fetcher: async (url, options) => {
    const headers = new Headers(options.headers);
    if (cookie) headers.set('Cookie', cookie);
    const response = await fetch(url, { ...options, headers });
    const owner = response.headers.getSetCookie().find((value) => value.startsWith('life_owner='));
    if (owner) cookie = owner.split(';')[0];
    return response;
  },
}));

let session = await api.prepareGenerateLocalSession({ countryIso3: 'RUS', birthYear: 2026 }).execute();
session = await api.prepareEditCharacter(session.id, session.version, {
  stats: { health: 100, intelligence: 99, relationships: 99, aura: 99 },
}).execute();
const id = session.id;
const checked = [];
let steps = 0;
let revisedScores = 0;

while (session.state.status === 'ACTIVE' && session.simulation.elapsedMonths < 132) {
  const before = session;
  const decision = before.state.pendingDecision;
  if (decision) {
    const restored = await api.getSession(id);
    assert.deepEqual(restored, before, 'GET must retain the same decision preview and full history');
    const original = structuredClone(restored);
    const presented = toServerDecision(restored.state.pendingDecision, restored.state.history);
    const option = decision.options.find((item) => item.effects && item.effects.stats.aura)
      ?? decision.options.find((item) => item.effects && Object.keys(item.effects.closeness).length > 0)
      ?? decision.options.find((item) => item.effects)
      ?? decision.options[0];
    const preview = presented.options.find((item) => item.id === option.id);
    assert.deepEqual(preview.changes, option.effects?.stats);
    assert.deepEqual(preview.closeness, option.effects?.closeness);
    assert.deepEqual(restored, original, 'Presentation must not apply the preview');
    const answer = api.prepareAnswer(id, decision.id, option.id, before.version);
    session = await answer.execute();
    assert.equal(session.id, id);
    assert.equal(session.simulation.elapsedMonths, before.simulation.elapsedMonths);
    assert.equal(session.version, before.version + 1);
    const namedCloseness = [];
    if (option.effects) {
      for (const [key, value] of Object.entries(before.state.stats)) {
        if (value == null || session.state.stats[key] == null) {
          assert.equal(option.effects.stats[key], undefined);
          continue;
        }
        assert.equal(session.state.stats[key] - value, option.effects.stats[key] ?? 0, `${decision.id}: ${key}`);
      }
      for (const person of before.simulation.family) {
        const next = session.simulation.family.find((item) => item.id === person.id);
        assert(next, 'Existing people must retain their server IDs');
        assert.equal(next.closeness - person.closeness, option.effects.closeness[person.id] ?? 0, `${decision.id}: ${person.id}`);
      }
      for (const [personId, delta] of Object.entries(preview.closeness)) {
        const person = before.simulation.family.find((item) => item.id === personId);
        assert(person, 'Closeness preview keys must resolve to existing family IDs');
        namedCloseness.push({ id: personId, name: person.name, delta });
      }
    }
    assert.deepEqual(await api.getSession(id), session, 'Restoration must use the result, not add preview values again');
    checked.push({ age: before.state.age, decision: decision.id, option: option.id, stats: preview.changes, closeness: namedCloseness });
  } else {
    session = await api.prepareProgress(session).execute();
    steps += 1;
  }
  const oldEvents = new Map(before.state.history.map((event) => [event.id, event]));
  for (const event of session.state.history) {
    assert(Number.isInteger(event.importance) && event.importance >= 0 && event.importance <= 100);
    assert(['EVENT_RULE', 'LIFE_STORY'].includes(event.importanceSource));
    const old = oldEvents.get(event.id);
    if (old && old.importance !== event.importance) revisedScores += 1;
  }
  const playback = updateSessionHistory(createHistoryPlayback(before.version, before.state.history), session, 0);
  assert.deepEqual(toServerHistory(visibleHistory(playback, 0)), toServerHistory(session.state.history));
}

assert(checked.length >= 2, 'At least two real choices must be checked');
assert(checked.some((item) => item.closeness.length > 0), 'Check actual family closeness deltas');
assert(checked.some((item) => item.stats?.aura), 'Check an actual aura delta');
const restored = await api.getSession(id);
assert.deepEqual(restored, session);
console.log(JSON.stringify({ id, steps, age: session.state.age, checked, revisedScores, restored: true }, null, 2));
