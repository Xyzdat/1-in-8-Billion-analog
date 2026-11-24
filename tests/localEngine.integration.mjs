// Explicit Docker check: node tests/localEngine.integration.mjs
// Uses an isolated guest and the local engine only; no external API quota.
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { getServerClockFrame, getServerClockKey, getServerYearProgress } from '../src/game/serverClock.ts';

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

const create = api.prepareGenerateLocalSession({ countryIso3: 'RUS', birthYear: 2026 });
let session = await create.execute();
assert.equal(session.provider, 'local');
assert.match(session.simulation.engineVersion, /^childhood-/);
assert.equal(session.simulation.elapsedMonths, 0);
assert.equal(session.character.birthplace.countryCode, 'RU');
assert.equal((await create.execute()).id, session.id);
const id = session.id;
const birthDetails = structuredClone(session.character.birthDetails);
await assert.rejects(api.prepareAdvance(id, session.version).execute(), { code: 'STEP_REQUIRED' });
let steps = 0;
let decisions = 0;
while (session.simulation.elapsedMonths < 86 && session.state.status === 'ACTIVE') {
  if (session.state.pendingDecision) {
    assert(session.state.age >= 3);
    const decision = session.state.pendingDecision;
    const months = session.simulation.elapsedMonths;
    const clockKey = getServerClockKey(session);
    await assert.rejects(api.prepareProgress(session).execute(), { code: 'DECISION_REQUIRED' });
    const answer = api.prepareAnswer(id, decision.id, decision.options[0].id, session.version);
    session = await answer.execute();
    assert.equal(session.simulation.elapsedMonths, months);
    assert.equal(getServerClockKey(session), clockKey);
    assert.equal((await answer.execute()).version, session.version);
    decisions += 1;
  } else {
    const previous = session;
    const command = api.prepareProgress(previous);
    session = await command.execute();
    assert(session.simulation.elapsedMonths > previous.simulation.elapsedMonths);
    assert(session.simulation.elapsedMonths <= previous.simulation.elapsedMonths + 2);
    assert(session.state.history.length > previous.state.history.length);
    assert.equal(session.version, previous.version + 1);
    if (steps === 0 && session.state.status === 'ACTIVE') {
      assert.equal((await command.execute()).version, session.version);
      await assert.rejects(api.prepareStep(id, previous.version).execute(), { code: 'VERSION_CONFLICT' });
    }
    steps += 1;
  }
  const restored = await api.getSession(id);
  assert.deepEqual(restored, session);
  assert.equal(restored.state.age, Math.floor(restored.simulation.elapsedMonths / 12));
  assert.equal(restored.simulation.monthOfYear, restored.simulation.elapsedMonths % 12);
  assert.deepEqual(restored.character.birthDetails, birthDetails);
  const frame = getServerClockFrame(restored);
  assert.equal(getServerYearProgress({ key: frame.key, milliseconds: 0, playedMs: 0 }, frame), restored.simulation.monthOfYear / 12);
  assert.equal(new Set(restored.state.history.map((event) => event.id)).size, restored.state.history.length);
}
assert(session.state.status === 'COMPLETE' || decisions > 0);
let purchaseCount = 0;
if (session.state.status === 'ACTIVE') {
  const shop = await api.getSpending(id, 'pets');
  const hamster = shop.offers.find((item) => item.id === 'hamster');
  assert(hamster.purchasable);
  const clockKey = getServerClockKey(session);
  const purchase = api.preparePurchase(id, {
    expectedVersion: shop.version, categoryId: 'pets', itemId: 'hamster', petName: 'Луна',
  });
  session = await purchase.execute();
  assert.equal(getServerClockKey(session), clockKey);
  assert.equal((await purchase.execute()).version, session.version);
  const budget = await api.getFinances(id);
  assert.equal(budget.summary.availableBalance, hamster.balanceAfterPurchase);
  assert.equal(budget.purchases.filter((item) => item.itemId === 'hamster').length, 1);
  assert.equal(budget.ledger.filter((entry) => entry.kind === 'PURCHASE').length, 1);
  purchaseCount = budget.purchases.length;
} else {
  assert(session.simulation.death);
}
for (const [countryIso3, countryIso2] of [['JPN', 'JP'], ['IND', 'IN']]) {
  const other = await api.prepareGenerateLocalSession({ countryIso3 }).execute();
  assert.equal(other.character.birthplace.countryCode, countryIso2);
  const stepped = await api.prepareProgress(other).execute();
  assert([1, 2].includes(stepped.simulation.elapsedMonths));
}
const legacy = await api.prepareCreateSession({
  character: {
    name: 'Старый движок', gender: 'Мужчина', birthYear: 2026,
    birthplace: { countryCode: 'RU', country: 'Россия', city: null },
  },
  startingStats: { health: 90, intelligence: 70, appearance: 60 },
}).execute();
assert.equal(legacy.simulation, null);
await assert.rejects(api.prepareStep(legacy.id, legacy.version).execute(), { code: 'STEP_UNSUPPORTED' });
assert.equal((await api.prepareProgress(legacy).execute()).state.age, 1);
console.log(JSON.stringify({ result: 'PASS', sessionId: id, steps, decisions,
  elapsedMonths: session.simulation.elapsedMonths, restoredEveryStep: true,
  purchases: purchaseCount, status: session.state.status, countries: ['RU', 'JP', 'IN'], legacyAdvance: 'PASS' }, null, 2));
