// Explicit Docker check: node tests/budgetManagement.integration.mjs
// Uses a separate guest and generated local life; never changes a user's save.
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { getServerClockKey } from '../src/game/serverClock.ts';

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
async function tick() {
  if (session.state.pendingDecision) {
    const d = session.state.pendingDecision;
    const options = [...d.options].sort((a, b) => {
      const score = (o) => (o.effects?.stats?.health ?? 0) * 4 + (o.effects?.stats?.happiness ?? 0)
        + (o.effects?.stats?.intelligence ?? 0) - (/университет|вуз|кредит|заём/iu.test(o.label) ? 10 : 0);
      return score(b) - score(a);
    });
    session = await api.prepareAnswer(session.id, d.id, options[0].id, session.version).execute();
  } else {
    session = await api.prepareProgress(session).execute();
  }
}

for (let attempt = 0; attempt < 4; attempt++) {
  session = await api.prepareGenerateLocalSession({ countryIso3: 'RUS', birthYear: 2026 }).execute();
  session = await api.prepareEditCharacter(session.id, session.version, {
    name: 'Проверка бюджета', stats: { health: 100, happiness: 100, intelligence: 100 },
  }).execute();
  while (session.state.age < 18 && session.state.status === 'ACTIVE') await tick();
  if (session.state.status === 'ACTIVE') break;
}
assert.equal(session.state.status, 'ACTIVE', 'No test life survived to adulthood');
while (session.state.pendingDecision) await tick();
const id = session.id;
const checks = [];

async function page(section) {
  const result = await api.getBudgetPage(id, section);
  assert.equal(result.available, true);
  assert.equal(result.version, session.version);
  return result;
}

async function act(action, optionId, expectedVersion = session.version) {
  const key = getServerClockKey(session);
  const command = api.prepareBudgetAction(id, { action, optionId, expectedVersion });
  session = await command.execute();
  assert.equal(session.id, id);
  assert.equal(getServerClockKey(session), key, `${action} reset game time`);
  const replay = await command.execute();
  assert.equal(replay.version, session.version);
  assert.deepEqual(replay.budgetAction, session.budgetAction);
  assert.equal((await api.getSession(id)).version, session.version);
  checks.push(`${action}:${session.budgetAction.status}`);
}

for (const section of ['income', 'expenses', 'jobs', 'side-jobs', 'businesses', 'strategies', 'assets']) await page(section);
let income = await page('income');
let expenses = await page('expenses');
let finances = await api.getFinances(id);
assert.equal(income.data.total, finances.summary.income);
assert.equal(expenses.data.total, finances.summary.expenses);
assert(Math.abs(income.data.sources.reduce((sum, entry) => sum + entry.amount, 0) - income.data.total) < 0.01);
assert(Math.abs(expenses.data.categories.reduce((sum, entry) => sum + entry.amount, 0) - expenses.data.total) < 0.01);

await act('SET_STRATEGY', 'cash');
assert.equal((await page('strategies')).data.selectedId, 'cash');
await assert.rejects(api.prepareBudgetAction(id, { expectedVersion: session.version, action: 'SET_STRATEGY', optionId: 'bonds' }).execute(), { code: 'STRATEGY_UNAVAILABLE' });
await act('SET_STRATEGY', 'deposit');

let jobs = await page('jobs');
if (jobs.data.canQuit) await act('QUIT_JOB', jobs.data.current.id);
jobs = await page('jobs');
for (const offer of [...jobs.data.offers].filter((o) => o.available).sort((a, b) => b.basePay - a.basePay)) {
  await act('APPLY_JOB', offer.id);
  if (session.budgetAction.status === 'APPLIED') break;
}
income = await page('income');
assert(income.data.primary, 'Test requires an accepted job');
const oldVersion = session.version;
const sideJobs = await page('side-jobs');
const side = sideJobs.data.offers.find((o) => o.available);
if (side) {
  await act('TAKE_SIDE_JOB', side.id);
  await assert.rejects(api.prepareBudgetAction(id, { expectedVersion: oldVersion, action: 'SET_STRATEGY', optionId: 'cash' }).execute(), { code: 'VERSION_CONFLICT' });
  const employed = await page('income');
  assert(employed.data.secondary);
  await act('QUIT_SIDE_JOB', employed.data.secondary.id);
}

const primaryBeforeQuit = (await page('income')).data.primary;
await act('QUIT_JOB', primaryBeforeQuit.id);
assert.equal((await page('income')).data.primary, null);
jobs = await page('jobs');
for (const offer of jobs.data.offers.filter((o) => o.available).sort((a, b) => b.basePay - a.basePay)) {
  await act('APPLY_JOB', offer.id);
  if (session.budgetAction.status === 'APPLIED') break;
}
assert((await page('income')).data.primary);

for (let step = 0; step < 6 && session.state.status === 'ACTIVE'; step++) {
  await tick();
  while (session.state.pendingDecision) await tick();
}
assert.equal(session.state.status, 'ACTIVE');
jobs = await page('jobs');
const raise = jobs.data.raiseGrounds.find((o) => o.available);
if (raise) await act('REQUEST_RAISE', raise.id);
const property = await api.getSpending(id, 'property');
const purchase = property.offers.find((o) => o.id === 'bicycle' && o.purchasable)
  ?? property.offers.filter((o) => o.purchasable).sort((a, b) => a.price - b.price)[0];
assert(purchase, 'Test requires an affordable property');
session = await api.preparePurchase(id, { expectedVersion: session.version, categoryId: 'property', itemId: purchase.id }).execute();
const assets = await page('assets');
const asset = assets.data.assets.find((a) => a.available);
assert(asset);
const preview = await api.getBudgetSalePreview(id, asset.id);
const beforeRead = await api.getSession(id);
assert.equal(beforeRead.version, preview.version);
await act('SELL_ASSET', asset.id, preview.version);
assert(!(await page('assets')).data.assets.some((a) => a.id === asset.id));
finances = await api.getFinances(id);
assert(finances.purchases.some((p) => p.itemId === purchase.id && p.status === 'SOLD'));
assert.equal(finances.summary.availableBalance, preview.data.balanceAfterSale);
await assert.rejects(api.prepareBudgetAction(id, { expectedVersion: session.version, action: 'SELL_ASSET', optionId: asset.id }).execute(), { code: 'ASSET_UNAVAILABLE' });

for (let step = 0; step < 48 && session.state.status === 'ACTIVE'; step++) {
  const businesses = await page('businesses');
  const offer = businesses.data.offers.find((o) => o.available);
  if (offer) {
    await act('OPEN_BUSINESS', offer.id);
    assert((await page('income')).data.business);
    break;
  }
  await tick();
  while (session.state.pendingDecision) await tick();
}
const restored = await api.getSession(id);
assert(checks.includes('OPEN_BUSINESS:APPLIED'), 'Test did not reach business opening');
assert.equal(restored.id, id);
assert.deepEqual(restored.simulation, session.simulation);
console.log(JSON.stringify({ result: 'PASS', sessionId: id, age: session.state.age, version: session.version, checks }, null, 2));
