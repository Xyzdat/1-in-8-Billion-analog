// Run explicitly against Docker: node tests/finances.integration.mjs
// Creates only a local life under a separate guest; never calls the external engine.
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';

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

let session = await api.prepareCreateSession({
  character: {
    name: 'Проверка финансов', gender: 'Женщина', birthYear: 2026,
    birthplace: { countryCode: 'GE', country: 'Грузия', city: 'Тбилиси' },
  },
  startingStats: { health: 91, intelligence: 72, appearance: 64 },
}).execute();
assert.equal(session.provider, 'local');
const id = session.id;
while (session.state.age < 7) {
  if (session.state.pendingDecision) {
    const decision = session.state.pendingDecision;
    const option = decision.options.find((item) => item.id === 'build') ?? decision.options[0];
    session = await api.prepareAnswer(id, decision.id, option.id, session.version).execute();
  } else {
    session = await api.prepareAdvance(id, session.version).execute();
  }
}
const before = await api.getFinances(id);
assert.equal(before.summary.availableBalance, 1200);
for (const category of before.categories) {
  const catalog = await api.getSpending(id, category.id);
  assert.equal(catalog.version, session.version);
  assert.equal(catalog.category.id, category.id);
  if (['education', 'city', 'country'].includes(category.id)) {
    assert(catalog.offers.every((offer) => !offer.purchasable));
  }
}
const pets = await api.getSpending(id, 'pets');
const hamster = pets.offers.find((item) => item.id === 'hamster');
assert(hamster.purchasable);
assert.equal(hamster.price, 600);
assert.equal(hamster.balanceAfterPurchase, 600);
const command = api.preparePurchase(id, {
  expectedVersion: pets.version, categoryId: 'pets', itemId: hamster.id, petName: 'Луна',
});
const bought = await command.execute();
const replay = await command.execute();
assert.equal(replay.version, bought.version);
assert.equal(bought.version, session.version + 1);
assert.equal(bought.id, id);
assert(bought.state.stats.happiness >= session.state.stats.happiness);
const budget = await api.getFinances(id);
assert.equal(budget.summary.availableBalance, 600);
assert.equal(budget.purchases.length, 1);
assert.equal(budget.purchases[0].petName, 'Луна');
assert.equal(budget.ledger.filter((entry) => entry.kind === 'PURCHASE').length, 1);
assert.equal(budget.summary.expenses, before.summary.expenses + 600);
assert.equal((await api.getSession(id)).version, bought.version);
await assert.rejects(api.preparePurchase(id, {
  expectedVersion: pets.version, categoryId: 'health', itemId: 'doctor',
}).execute(), { code: 'VERSION_CONFLICT' });
const owned = await api.getSpending(id, 'pets');
assert.equal(owned.version, bought.version);
assert.equal(owned.availableBalance, 600);
const health = await api.getSpending(id, 'health');
assert(health.offers.every((offer) => !offer.purchasable));
session = await api.prepareAdvance(id, bought.version).execute();
const nextYear = await api.getFinances(id);
assert(nextYear.ledger.some((entry) => entry.kind === 'UPKEEP'));
assert.equal(nextYear.version, session.version);
assert.equal(nextYear.purchases.length, 1);
while (session.state.age < 21) {
  session = await api.prepareAdvance(id, session.version).execute();
}
const purchasedCategories = [];
for (const categoryId of ['relationships', 'property', 'health', 'hobby', 'appearance', 'pets', 'education', 'city', 'country']) {
  const catalog = await api.getSpending(id, categoryId);
  const offer = catalog.offers.filter((item) => item.purchasable).sort((a, b) => a.price - b.price)[0];
  assert(offer, `Expected an affordable offer in ${categoryId}`);
  session = await api.preparePurchase(id, {
    expectedVersion: catalog.version, categoryId, itemId: offer.id,
    ...(categoryId === 'pets' ? { petName: 'Снежок' } : {}),
  }).execute();
  const updated = await api.getFinances(id);
  assert.equal(updated.version, session.version);
  assert.equal(updated.summary.availableBalance, offer.balanceAfterPurchase);
  assert.equal(updated.purchases[0].itemId, offer.id);
  if (offer.location) assert.deepEqual(updated.location, offer.location);
  if (['property', 'education', 'hobby'].includes(categoryId)) {
    const refreshed = await api.getSpending(id, categoryId);
    assert.equal(refreshed.offers.find((item) => item.id === offer.id).purchasable, false);
  }
  purchasedCategories.push(categoryId);
}
session = await api.prepareAdvance(id, session.version).execute();
assert.equal(session.state.status, 'COMPLETE');
const completed = await api.getFinances(id);
assert(completed.purchases.some((item) => item.categoryId === 'education' && item.status === 'COMPLETED'));
assert((await api.getSpending(id, 'health')).offers.every((offer) => !offer.purchasable));
console.log(JSON.stringify({
  result: 'PASS', provider: session.provider, sessionId: id,
  before: before.summary.availableBalance, afterPurchase: budget.summary.availableBalance,
  purchases: budget.purchases.length, purchaseCharges: budget.ledger.filter((entry) => entry.kind === 'PURCHASE').length,
  nextAge: nextYear.age, nextBalance: nextYear.summary.availableBalance,
  categoriesChecked: before.categories.length,
  purchasedCategories, completedAt: session.state.age,
}, null, 2));
