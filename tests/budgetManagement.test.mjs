import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { decodeBudgetPage, decodeBudgetSalePreview, decodeSession, decodeFinances, validateBudgetAction } from '../src/api/sessionDecoders.ts';
import { budgetActionBlockReason, budgetResourceReady } from '../src/game/budgetPresentation.ts';
import { prepareSessionMutation } from '../src/game/sessionMutation.ts';
import { getServerClockKey } from '../src/game/serverClock.ts';
import { ApiError } from '../src/api/errors.ts';
import { adultSession, adultFinances } from './fixtures/adultSession.mjs';
import { budgetPage, budgetPages, salePreview } from './fixtures/budgetPages.mjs';

test('0.11 decodes every budget page, zeros, missing legacy detail and unsupported wrappers', () => {
  for (const [section, payload] of Object.entries(budgetPages())) {
    assert.equal(decodeBudgetPage(payload, section), payload);
    const unsupported = budgetPage(null, { currency: null, periodMonths: null, available: false, reason: 'Недоступно' });
    assert.equal(decodeBudgetPage(unsupported, section).data, null);
  }
  const negative = salePreview({ net: -500, balanceAfterSale: 0, forecast: null });
  assert.equal(decodeBudgetSalePreview(negative).data.net, -500);
  assert.equal(decodeBudgetSalePreview(negative).data.rentalIncomeStopped, null);
});

test('0.11 rejects malformed nested budget fields instead of using a TypeScript cast', () => {
  for (const [section, mutate] of [
    ['income', (d) => { d.primary.expectedPay = '0'; }],
    ['income', (d) => { d.primary.actualIncome = Infinity; }],
    ['expenses', (d) => { d.forecast.months = 12; }],
    ['expenses', (d) => { delete d.obligations[0].assetId; }],
    ['jobs', (d) => { d.offers[0].available = 1; }],
    ['jobs', (d) => { d.raiseGrounds[0].guaranteed = true; }],
    ['businesses', (d) => { d.offers[0].risk = 101; }],
    ['strategies', (d) => { d.options[0].annualBasisPoints = NaN; }],
    ['assets', (d) => { d.assets[0].debtIds = [1]; }],
  ]) {
    const page = budgetPages()[section];
    mutate(page.data);
    assert.throws(() => decodeBudgetPage(page, section));
  }
  assert.throws(() => decodeBudgetPage(budgetPage({}), '../jobs'));
});

test('budget outcomes and SOLD purchases survive full-session restore without altering totals', () => {
  const session = adultSession();
  for (const status of ['APPLIED', 'DECLINED']) {
    session.budgetAction = { status, code: 'OK', message: 'Результат', month: 420, currency: 'RUB', periodMonths: null, amounts: {} };
    assert.equal(decodeSession(session), session);
  }
  session.budgetAction.amounts = { net: -1, basePay: 0 };
  assert.equal(decodeSession(session).budgetAction.amounts.net, -1);
  session.budgetAction.amounts.basePay = NaN;
  assert.throws(() => decodeSession(session));
  const finances = adultFinances();
  finances.purchases = [{ id: '12345678-1234-1234-1234-123456789abc', month: 400, categoryId: 'property', itemId: 'motorcycle',
    title: 'Мотоцикл', icon: '🏍️', price: 6000, yearlyCost: 600, durationMonths: null, petName: null, status: 'SOLD', location: null }];
  Object.assign(finances.ledger[0], { sourceId: 'ASSET_SALE', categoryId: null, relatedId: 'asset-1', flow: 'FINANCING' });
  assert.equal(decodeFinances(finances).summary.income, 240000);
  assert.equal(decodeFinances(finances).purchases[0].status, 'SOLD');
});

test('budget commands accept only version, action and option ID', () => {
  const valid = { expectedVersion: 12, action: 'SELL_ASSET', optionId: 'asset-1' };
  assert.doesNotThrow(() => validateBudgetAction(valid));
  for (const changes of [{ action: 'TRANSFER' }, { expectedVersion: 0 }, { optionId: ' ' }, { price: 1 }]) {
    assert.throws(() => validateBudgetAction({ ...valid, ...changes }));
  }
});

test('budget routes use the guest client; a lost response retries the same immutable command', async () => {
  const calls = [];
  let attempts = 0;
  const session = adultSession();
  session.budgetAction = { status: 'DECLINED', code: 'APPLICATION_DECLINED', message: 'Отказ', month: 420, currency: 'RUB', periodMonths: null, amounts: {} };
  const api = createSessionsApi(createApiClient({ baseUrl: '/api', fetcher: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/guest')) return new Response(null, { status: 204 });
    assert.equal(options.credentials, 'same-origin');
    if (url.endsWith('/sale-preview')) return Response.json(salePreview());
    if (url.endsWith('/actions')) {
      if (++attempts === 1) throw new TypeError('Response lost');
      return Response.json(session);
    }
    return Response.json(budgetPages()[url.split('/').at(-1)]);
  } }));
  for (const section of Object.keys(budgetPages())) await api.getBudgetPage(session.id, section);
  await api.getBudgetSalePreview(session.id, 'asset-1');
  const payload = { expectedVersion: session.version, action: 'APPLY_JOB', optionId: 'warehouse' };
  const command = api.prepareBudgetAction(session.id, payload);
  payload.optionId = 'changed';
  await assert.rejects(command.execute(), { kind: 'network' });
  const result = await command.execute();
  assert.equal(result.budgetAction.status, 'DECLINED');
  assert.equal(getServerClockKey(result), getServerClockKey(session));
  const actions = calls.filter((call) => call.url.endsWith('/actions'));
  assert.equal(actions.length, 2);
  assert.equal(actions[0].options.body, actions[1].options.body);
  assert.equal(JSON.parse(actions[1].options.body).optionId, 'warehouse');
  assert.equal(actions[0].options.headers.get('Idempotency-Key'), actions[1].options.headers.get('Idempotency-Key'));
});

for (const code of ['VERSION_CONFLICT', 'BUDGET_ACTION_UNAVAILABLE', 'JOB_CHANGED', 'ASSET_UNAVAILABLE', 'BUDGET_ACTION_BLOCKED', 'STRATEGY_UNAVAILABLE']) {
  test(`${code}: refresh the full snapshot; never resubmit the rejected action`, async () => {
    let writes = 0;
    let reads = 0;
    const current = adultSession();
    const updated = { ...current, version: current.version + 1 };
    const execute = prepareSessionMutation(current, () => ({
      idempotencyKey: 'key', execute: async () => { writes++; throw new ApiError('', 'http', 409, { code }); },
    }), async () => { reads++; return updated; });
    for (let i = 0; i < 2; i++) assert.equal((await execute(new AbortController().signal)).session, updated);
    assert.equal(writes, 1);
    assert.equal(reads, 2);
  });
}

test('budget actions require active adult local life and matching fresh catalog', () => {
  const session = adultSession();
  session.state.pendingDecision = null;
  session.state.stats.health = 90;
  assert.equal(budgetActionBlockReason(session), '');
  for (const mutate of [
    (s) => { s.state.age = 17; }, (s) => { s.state.status = 'COMPLETE'; },
    (s) => { s.state.pendingDecision = {}; }, (s) => { s.provider = '1in8b'; },
    (s) => { delete s.simulation; }, (s) => { s.state.stats.health = 0; },
  ]) {
    const changed = structuredClone(session);
    mutate(changed);
    assert(budgetActionBlockReason(changed));
  }
  const resource = { data: budgetPage({}), loading: false, error: '' };
  assert(budgetResourceReady(resource, 12));
  assert(!budgetResourceReady(resource, 13));
  assert(!budgetResourceReady({ ...resource, loading: true }, 12));
});
