// Explicit Docker verification; isolated guest, local engine only.
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';
import { toServerFamily, toServerHistory } from '../src/game/serverPresentation.ts';
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

let session;
for (const countryIso3 of ['RUS', 'IND', 'JPN']) {
  const command = api.prepareGenerateLocalSession({ countryIso3 });
  session = await command.execute();
  assert.equal(session.simulation.engineVersion, 'childhood-2');
  assert.equal(session.character.birthFacts.countryIso3, countryIso3);
  const card = toGeneratedBirthCard(session);
  assert.notEqual(card.birthChance, 'Нет данных');
  assert(card.countryDetails.every(({ value }) => value !== 'Нет данных'));
  assert(card.familyDetails.every(({ value }) => value !== 'Нет данных'));
  assert.match(card.countryDetails[1].value, /^[\d\s]+ USD$/);
  assert.match(card.lifeExpectancy, /^\d+ (год|года|лет)$/);
  assert.deepEqual(await command.execute(), session);
  assert.deepEqual(await api.getSession(session.id), session);
}
const id = session.id;
const birthSnapshot = structuredClone(session.character);
let previousFamily = session.simulation.family;
let steps = 0;
let decisions = 0;
let auraChanges = 0;
let closenessChanges = 0;
let bought = false;
while (session.state.status === 'ACTIVE' && session.simulation.elapsedMonths < 2400) {
  const previous = session;
  if (session.state.pendingDecision) {
    const decision = session.state.pendingDecision;
    const option = decision.options[decisions % decision.options.length];
    const command = api.prepareAnswer(id, decision.id, option.id, session.version);
    session = await command.execute();
    assert.equal(session.simulation.elapsedMonths, previous.simulation.elapsedMonths);
    assert.equal(getServerClockKey(session), getServerClockKey(previous));
    assert.deepEqual(await command.execute(), session);
    decisions += 1;
  } else {
    session = await api.prepareProgress(session).execute();
    assert(session.simulation.elapsedMonths > previous.simulation.elapsedMonths);
    assert(session.simulation.elapsedMonths <= previous.simulation.elapsedMonths + 2);
    steps += 1;
  }
  assert.equal(session.id, id);
  assert.deepEqual(session.character, birthSnapshot);
  const additions = session.state.history.slice(previous.state.history.length);
  for (const event of toServerHistory(additions)) {
    if (event.aura) auraChanges += 1;
    if (Object.values(event.closeness ?? {}).some((value) => value !== 0)) closenessChanges += 1;
  }
  const people = toServerFamily(session.simulation.family);
  for (const person of previousFamily) {
    const current = session.simulation.family.find((member) => member.id === person.id);
    assert(current);
    if (!person.alive) {
      assert.equal(current.alive, false);
      assert.equal(current.age, person.age);
    }
    assert.equal(people.find((member) => member.id === current.id).closeness, current.closeness);
  }
  previousFamily = session.simulation.family;
  if (!bought && session.state.status === 'ACTIVE' && !session.state.pendingDecision && session.state.age >= 7) {
    const shop = await api.getSpending(id, 'pets');
    const hamster = shop.offers.find((offer) => offer.id === 'hamster');
    if (hamster?.purchasable) {
      const key = getServerClockKey(session);
      session = await api.preparePurchase(id, {
        expectedVersion: session.version, categoryId: 'pets', itemId: 'hamster', petName: 'Луна',
      }).execute();
      assert.equal(getServerClockKey(session), key);
      bought = true;
    }
  }
}
assert.equal(session.state.status, 'COMPLETE');
assert(session.simulation.death);
assert.equal(session.simulation.elapsedMonths, session.simulation.death.elapsedMonths);
assert.equal(session.state.age, session.simulation.death.age);
assert.equal(session.state.pendingDecision, null);
const restored = await api.getSession(id);
assert.deepEqual(restored, session);
const frame = getServerClockFrame(restored);
assert.equal(getServerYearProgress({ key: frame.key, milliseconds: 0, playedMs: 0 }, frame, true), restored.simulation.death.elapsedMonths % 12 / 12);
assert.equal(new Set(restored.state.history.map((event) => event.id)).size, restored.state.history.length);
await assert.rejects(api.prepareProgress(restored).execute(), { code: 'SESSION_COMPLETE' });
await assert.rejects(api.preparePurchase(id, {
  expectedVersion: restored.version, categoryId: 'pets', itemId: 'hamster', petName: 'Луна',
}).execute(), { code: 'SESSION_COMPLETE' });
console.log(JSON.stringify({ result: 'PASS', sessionId: id, steps, decisions, auraChanges, closenessChanges,
  death: restored.simulation.death, deadRelatives: restored.simulation.family.filter((person) => !person.alive).length,
  purchaseChecked: bought, restoredComplete: true }, null, 2));
