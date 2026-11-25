// Explicit Docker check: node tests/adultLife.integration.mjs
// Creates its own guest and local lives; never calls the external engine.
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { prepareSessionMutation } from '../src/game/sessionMutation.ts';

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

let adultSeen = false;
let paidAccepted = 0;
let rejected = 0;
let steps = 0;
let decisions = 0;
let maxFamily = 0;
const roles = new Set();

for (let attempt = 0; attempt < 5 && (!adultSeen || !paidAccepted); attempt += 1) {
  let session = await api.prepareGenerateLocalSession({ countryIso3: 'JPN' }).execute();
  const id = session.id;
  for (let action = 0; action < 1600 && session.state.status !== 'COMPLETE'; action += 1) {
    const pending = session.state.pendingDecision;
    if (pending) {
      const months = session.simulation.elapsedMonths;
      const options = [...pending.options].sort((a, b) => Number(/₽|руб/.test(b.label)) - Number(/₽|руб/.test(a.label)));
      let answered = false;
      for (const option of options) {
        const execute = prepareSessionMutation(session, (current) => api.prepareAnswer(
          current.id, pending.id, option.id, current.version,
        ), api.getSession);
        const result = await execute(new AbortController().signal);
        session = result.session;
        const finances = await api.getFinances(id);
        assert.equal(finances.version, session.version);
        if (result.rejectedCode) {
          assert(['SPENDING_INSUFFICIENT_FUNDS', 'DECISION_CHANGED'].includes(result.rejectedCode));
          rejected += 1;
          continue;
        }
        assert.equal(session.simulation.elapsedMonths, months);
        if (/₽|руб/.test(option.label) && session.simulation.adult) paidAccepted += 1;
        decisions += 1;
        answered = true;
        break;
      }
      assert(answered, 'No available decision option');
    } else {
      session = await api.prepareProgress(session).execute();
      steps += 1;
    }
    assert.equal(session.id, id, 'Adult transition must retain the original character');
    if (session.simulation.adult && !adultSeen) {
      adultSeen = true;
      assert.deepEqual(await api.getSession(id), session, 'Reload must retain the full adult snapshot');
      console.log(JSON.stringify({ adultReached: session.state.age, version: session.version }));
    }
    maxFamily = Math.max(maxFamily, session.simulation.family.length);
    for (const person of session.simulation.family) roles.add(person.role);
    assert.equal(new Set(session.simulation.family.map((person) => person.id)).size, session.simulation.family.length);
  }
  assert.equal(session.state.status, 'COMPLETE');
  assert.equal(session.state.pendingDecision, null);
  assert(session.simulation.death);
  assert.deepEqual(await api.getSession(id), session);
  await assert.rejects(api.prepareProgress(session).execute(), { code: 'SESSION_COMPLETE' });
  const finalFinances = await api.getFinances(id);
  assert.equal(finalFinances.version, session.version);
  console.log(JSON.stringify({ completedAt: session.state.age, adult: Boolean(session.simulation.adult), family: session.simulation.family.length }));
}
assert(adultSeen, 'No adult life reached');
assert(paidAccepted > 0, 'No paid adult decision exercised');
console.log(JSON.stringify({ steps, decisions, paidAccepted, rejected, maxFamily, roles: [...roles] }));

let paidRejectionChecked = false;
for (let attempt = 0; attempt < 5 && !paidRejectionChecked; attempt += 1) {
  let session = await api.prepareGenerateLocalSession({ countryIso3: 'JPN' }).execute();
  for (let action = 0; action < 600 && session.state.status !== 'COMPLETE'; action += 1) {
    const pending = session.state.pendingDecision;
    if (!pending) {
      session = await api.prepareProgress(session).execute();
      continue;
    }
    const paid = session.simulation.adult && pending.options.map((option) => ({
      ...option,
      cost: Number(option.label.match(/([\d\s\u00a0]+(?:[.,]\d{1,2})?)\s*₽/)?.[1].replace(/\s/g, '').replace(',', '.')),
    })).find((option) => option.cost > 0);
    if (paid) {
      let budget = await api.getFinances(session.id);
      // Spend on existing services without advancing the pending decision.
      for (let purchase = 0; purchase < 200 && budget.summary.availableBalance >= paid.cost; purchase += 1) {
        const shop = await api.getSpending(session.id, 'health');
        const offer = [...shop.offers].filter((item) => item.purchasable && item.price > 0)
          .sort((a, b) => b.price - a.price)[0];
        if (!offer) break;
        session = await api.preparePurchase(session.id, {
          expectedVersion: shop.version, categoryId: 'health', itemId: offer.id,
        }).execute();
        budget = await api.getFinances(session.id);
      }
      if (budget.summary.availableBalance < paid.cost) {
        const before = structuredClone(session);
        const execute = prepareSessionMutation(session, (current) => api.prepareAnswer(
          current.id, pending.id, paid.id, current.version,
        ), api.getSession);
        const result = await execute(new AbortController().signal);
        assert.equal(result.rejectedCode, 'SPENDING_INSUFFICIENT_FUNDS');
        assert.deepEqual(result.session, before);
        assert.deepEqual(await api.getFinances(session.id), budget);
        session = result.session;
        const alternate = pending.options.find((option) => option.id !== paid.id && !/₽|руб/.test(option.label));
        assert(alternate, 'Expected a free alternative');
        session = await api.prepareAnswer(session.id, pending.id, alternate.id, session.version).execute();
        assert.equal(session.id, before.id);
        assert.equal(session.simulation.elapsedMonths, before.simulation.elapsedMonths);
        assert.equal((await api.getFinances(session.id)).version, session.version);
        assert.deepEqual(await api.getSession(session.id), session);
        paidRejectionChecked = true;
        console.log(JSON.stringify({ paidRejection: result.rejectedCode, alternateAccepted: true, age: session.state.age }));
        break;
      }
    }
    session = await api.prepareAnswer(session.id, pending.id, pending.options.at(-1).id, session.version).execute();
  }
}
assert(paidRejectionChecked, 'No insufficient-funds paid decision exercised');
