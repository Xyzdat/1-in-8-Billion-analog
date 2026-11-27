// Explicit Docker check: node tests/yearFocus.integration.mjs
// All commands use an isolated guest and new test saves.
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { prepareSessionMutation } from '../src/game/sessionMutation.ts';
import { getServerClockKey } from '../src/game/serverClock.ts';
import { yearFocusOptions } from '../src/game/yearFocusPresentation.ts';

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
const id = session.id;
assert.equal(session.simulation.yearlyFocus.selectedId, 'balanced');
await assert.rejects(api.prepareFocus(id, session.version, 'work').execute(), { code: 'FOCUS_UNAVAILABLE' });
session = await api.prepareEditCharacter(id, session.version, { stats: { health: 100, intelligence: 20 } }).execute();

async function progress() {
  assert.equal(session.state.status, 'ACTIVE', 'Test life must survive to exercise focus');
  if (session.state.pendingDecision) {
    const decision = session.state.pendingDecision;
    const option = decision.options.find((item) => item.effects) ?? decision.options[0];
    session = await api.prepareAnswer(id, decision.id, option.id, session.version).execute();
  } else session = await api.prepareProgress(session).execute();
}

while (session.state.age < 3) await progress();
const before = structuredClone(session);
const budgetBefore = await api.getFinances(id);
const change = api.prepareFocus(id, session.version, 'learning');
session = await change.execute();
assert.equal(session.id, id);
assert.equal(session.version, before.version + 1);
assert.equal(getServerClockKey(session), getServerClockKey(before));
assert.deepEqual(session.state.stats, before.state.stats);
assert.deepEqual(session.state.pendingDecision, before.state.pendingDecision);
assert.deepEqual(session.simulation.skills, before.simulation.skills);
assert.deepEqual(session.simulation.family, before.simulation.family);
assert.equal(session.simulation.yearlyFocus.selectedId, 'learning');
const budgetAfter = await api.getFinances(id);
assert.deepEqual(budgetAfter.summary, budgetBefore.summary);
assert.deepEqual(budgetAfter.ledger, budgetBefore.ledger);
assert.deepEqual(await api.getSession(id), session);
assert.deepEqual(await change.execute(), session);
const learning = yearFocusOptions(session.simulation.yearlyFocus).find((item) => item.id === 'learning');
assert(learning.effects.some((item) => item.text === 'Интеллект +3'));
assert(learning.effects.some((item) => item.text === 'Счастье −1'));
assert(learning.effects.some((item) => item.text === 'Учебная практика +3'));

while (session.simulation.elapsedMonths < before.simulation.elapsedMonths + 4) await progress();
assert.equal(session.simulation.yearlyFocus.selectedId, 'learning');
assert.equal(session.simulation.yearlyFocus.lastApplied.focusId, 'learning');
assert.equal(session.simulation.yearlyFocus.lastApplied.stats.intelligence, 1);
assert.equal(session.simulation.yearlyFocus.lastApplied.skills.learning, 1);
assert.deepEqual(await change.execute(), session, 'Replaying a previous key returns the current snapshot without resetting focus or time');
const accrued = structuredClone(session.simulation.yearlyFocus.lastApplied);

const stale = structuredClone(session);
session = await api.prepareFocus(id, session.version, 'home').execute();
assert.deepEqual(session.simulation.yearlyFocus.lastApplied, accrued, 'Changing focus must not relabel an earlier payout');
const conflict = prepareSessionMutation(stale,
  (current) => api.prepareFocus(id, current.version, 'health'), api.getSession);
const recovered = await conflict(new AbortController().signal);
assert.equal(recovered.rejectedCode, 'VERSION_CONFLICT');
assert.deepEqual(recovered.session, session);
assert.equal(recovered.session.simulation.yearlyFocus.selectedId, 'home');
while (session.state.age < 4) await progress();
assert.equal(session.simulation.yearlyFocus.selectedId, 'home', 'A birthday must not reset the selected direction');
assert.deepEqual(await api.getSession(id), session);

session = await api.prepareEditCharacter(id, session.version, { stats: { health: 0 } }).execute();
if (session.state.status === 'ACTIVE') {
  session = await api.prepareFocus(id, session.version, 'rest').execute();
  assert.equal(session.state.status, 'COMPLETE');
} else await assert.rejects(api.prepareFocus(id, session.version, 'rest').execute(), { code: 'SESSION_COMPLETE' });
assert.equal(session.id, id);
assert.deepEqual(await api.getSession(id), session);

const old = await api.prepareCreateSession({
  character: { name: 'Проверка старой жизни', gender: 'Мужчина', birthYear: 2026,
    birthplace: { countryCode: 'RU', country: 'Россия' } },
  startingStats: { health: 90, intelligence: 50, appearance: 60 },
}).execute();
assert.equal(old.simulation?.yearlyFocus ?? null, null);
await assert.rejects(api.prepareFocus(old.id, old.version, 'learning').execute(), { code: 'FOCUS_UNSUPPORTED' });
assert.deepEqual(await api.getSession(old.id), old);
console.log(JSON.stringify({ id, selectedAfterBirthday: 'home', accrued,
  restored: true, conflictRefreshed: true, completeStopped: true, oldSaveSupported: true }, null, 2));
