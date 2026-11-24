import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { decodeFinances, decodeSpendingShop, validatePurchase } from '../src/api/sessionDecoders.ts';
import { formatServerMoney, formatSpendingEffects, groupSpendingCategories } from '../src/game/financePresentation.ts';
import { getServerClockKey } from '../src/game/serverClock.ts';

const id = '12345678-1234-1234-1234-123456789abc';
const stats = { health: 91, happiness: 80, intelligence: 72, relationships: 90, appearance: null, aura: null };
const category = {
  id: 'pets', groupId: 'pets', groupTitle: 'Домашние животные', title: 'Завести питомца',
  actionTitle: 'Завести питомца', description: null, icon: '🐾', minAge: 6, priceFrom: 600, actions: [],
};
const offer = {
  id: 'hamster', title: 'Хомяк', description: null, icon: '🐹', price: 600, yearlyCost: 1200,
  durationMonths: null, minAge: 6, effects: { happiness: 3, health: null }, location: null,
  purchasable: true, unavailableReason: null, balanceAfterPurchase: 600,
};
const shop = {
  version: 9, age: 7, currency: 'RUB', category, heading: 'Новый друг', description: '',
  confirmLabel: 'Купить', availableBalance: 1200, stats, suggestedPetNames: [], offers: [offer],
};
const finances = {
  version: 9, age: 7, currency: 'RUB',
  summary: {
    income: 1200, expenses: 0, periodMonths: 12, savings: 1200, debt: 0, availableBalance: 1200,
    netWorth: null, occupation: null, depositRateBasisPoints: 100, asOfAge: 7,
  },
  ledger: [], purchases: [], categories: [category],
  location: { countryCode: 'CA', country: 'Канада', city: null },
};
const session = {
  id, provider: 'local', version: 10, savedAt: '2026-11-23T10:00:00Z',
  character: {
    name: 'Тест', gender: 'Мужчина', birthYear: 2026,
    birthplace: { countryCode: 'CA', country: 'Канада', city: null },
  },
  state: { age: 7, status: 'ACTIVE', stats, pendingDecision: null, history: [] },
};

test('0.5 finance decoders preserve zeros, null, empty arrays and unknown provider balances', () => {
  assert.equal(decodeFinances(finances), finances);
  assert.equal(decodeSpendingShop(shop), shop);
  const ppp = structuredClone(finances);
  ppp.currency = 'PPP_USD';
  for (const key of Object.keys(ppp.summary)) ppp.summary[key] = null;
  ppp.summary.income = 0;
  ppp.summary.netWorth = 35000.5;
  ppp.ledger = null;
  ppp.purchases = null;
  ppp.categories = [];
  ppp.location = null;
  assert.equal(decodeFinances(ppp).summary.income, 0);
  assert.equal(decodeFinances(ppp).summary.availableBalance, null);
  const readOnly = structuredClone(shop);
  Object.assign(readOnly, { currency: 'PPP_USD', availableBalance: null, confirmLabel: null });
  Object.assign(readOnly.offers[0], { purchasable: false, balanceAfterPurchase: null, effects: null });
  assert.equal(decodeSpendingShop(readOnly).offers[0].purchasable, false);
});

test('nested finance payloads reject missing fields, invalid money, enums and locations', () => {
  const mutations = [
    (data) => { delete data.summary.availableBalance; },
    (data) => { data.summary.savings = NaN; },
    (data) => { data.currency = 'USD'; },
    (data) => { data.location.countryCode = 'CAN'; },
    (data) => { data.categories[0].actions = [{ ...offer, price: -1 }]; },
    (data) => { data.ledger = [{ id: 'x', month: -1, kind: 'PURCHASE', title: '', income: 0, expense: 0 }]; },
    (data) => { data.purchases = [{ id: 'invalid' }]; },
  ];
  for (const mutate of mutations) {
    const data = structuredClone(finances);
    mutate(data);
    assert.throws(() => decodeFinances(data));
  }
  const invalid = structuredClone(shop);
  invalid.offers[0].balanceAfterPurchase = -1;
  assert.throws(() => decodeSpendingShop(invalid));
});

test('purchase request accepts only IDs/version and a valid pet name', () => {
  const valid = { expectedVersion: 9, categoryId: 'pets', itemId: 'hamster', petName: 'Луна' };
  assert.doesNotThrow(() => validatePurchase(valid));
  assert.doesNotThrow(() => validatePurchase({ expectedVersion: 9, categoryId: 'health', itemId: 'doctor' }));
  for (const change of [
    { petName: '' }, { petName: '  ' }, { petName: null }, { petName: 'x'.repeat(41) },
    { petName: 'Луна\n' }, { price: 1 }, { expectedVersion: 0 }, { categoryId: 'health' },
  ]) {
    assert.throws(() => validatePurchase({ ...valid, ...change }));
  }
});

test('finance requests use guest cookie, versioned catalogs and immutable idempotent purchase retries', async () => {
  const calls = [];
  let purchaseAttempts = 0;
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      calls.push({ url, options });
      assert.equal(options.credentials, 'same-origin');
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      if (url.endsWith('/finances')) return Response.json(finances);
      if (url.endsWith('/spending/pets')) return Response.json(shop);
      assert.equal(url, `/api/v1/sessions/${id}/purchases`);
      if (++purchaseAttempts === 1) throw new TypeError('Response lost');
      return Response.json(session);
    },
  }));
  const budget = await api.getFinances(id);
  const catalog = await api.getSpending(id, 'pets');
  assert.equal(budget.version, 9);
  const payload = { expectedVersion: catalog.version, categoryId: 'pets', itemId: 'hamster', petName: 'Луна' };
  const command = api.preparePurchase(id, payload);
  payload.petName = 'Изменённое имя';
  await assert.rejects(command.execute(), { kind: 'network' });
  const updated = await command.execute();
  assert.equal(updated.version, 10);
  const purchases = calls.filter(({ url }) => url.endsWith('/purchases'));
  assert.equal(purchases.length, 2);
  assert.equal(purchases[0].options.body, purchases[1].options.body);
  assert.deepEqual(JSON.parse(purchases[0].options.body), {
    expectedVersion: 9, categoryId: 'pets', itemId: 'hamster', petName: 'Луна',
  });
  assert.equal(purchases[0].options.headers.get('Idempotency-Key'), command.idempotencyKey);
  assert.equal(purchases[1].options.headers.get('Idempotency-Key'), command.idempotencyKey);
  assert.notEqual(api.preparePurchase(id, { ...payload }).idempotencyKey, command.idempotencyKey);
});

test('purchase version conflicts surface without automatically resubmitting a different command', async () => {
  let commands = 0;
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url) => {
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      commands += 1;
      return Response.json({ code: 'VERSION_CONFLICT', message: 'Conflict' }, { status: 409 });
    },
  }));
  await assert.rejects(api.preparePurchase(id, {
    expectedVersion: 9, categoryId: 'health', itemId: 'doctor',
  }).execute(), { code: 'VERSION_CONFLICT' });
  assert.equal(commands, 1);
});

test('presentation keeps PPP separate from RUB and groups both moves in one section', () => {
  assert.equal(formatServerMoney(null, 'PPP_USD'), 'Нет данных');
  assert.equal(formatServerMoney(0, 'RUB'), '0 ₽');
  assert.match(formatServerMoney(10.5, 'PPP_USD'), /10,5 \$ ППС/);
  assert.equal(formatSpendingEffects({ health: 2, happiness: -1, intelligence: null }), 'Здоровье +2 · Счастье -1');
  assert.equal(formatSpendingEffects(null), '');
  const groups = groupSpendingCategories([
    category,
    { ...category, id: 'city', groupId: 'moving', groupTitle: 'Переезд' },
    { ...category, id: 'country', groupId: 'moving', groupTitle: 'Переезд' },
  ]);
  assert.deepEqual(groups.map((group) => group.categories.map((item) => item.id)), [['pets'], ['city', 'country']]);
});

test('purchases, decisions and refreshes do not reset the year; advancing does', () => {
  const key = getServerClockKey(session);
  assert.equal(getServerClockKey({ ...session, version: 11 }), key);
  assert.notEqual(getServerClockKey({ ...session, state: { ...session.state, age: 8 } }), key);
  assert.equal(getServerClockKey({ ...session, state: { ...session.state, pendingDecision: { id: 'choice' } } }), key);
});
