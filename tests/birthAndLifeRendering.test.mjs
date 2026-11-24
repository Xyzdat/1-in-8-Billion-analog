import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';
import { supportedCountries } from '../src/data/supportedCountries.ts';

let vite;
before(async () => {
  vite = await createServer({
    cacheDir: 'node_modules/.vite-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
  });
});
after(async () => { await vite?.close(); });

test('existing mock country selector includes every supported country and preserves previous options', async () => {
  const { parameterFields, countryCodes } = await vite.ssrLoadModule('/src/mocks/parameterOptions.ts');
  const options = parameterFields.country.options;
  assert.equal(new Set(options.map(({ label }) => label)).size, options.length);
  for (const country of supportedCountries) {
    assert(options.some(({ label }) => label === country.name));
    assert.equal(countryCodes[country.name], country.iso2);
  }
  assert(options.some(({ label }) => label === 'Франция'));
  assert(options.some(({ label }) => label === 'Турция'));
});

test('existing country and family cards render compact values without source or model annotations', async () => {
  const { default: Country } = await vite.ssrLoadModule('/src/components/bearthSetupPage/BirthCountryCard.tsx');
  const { default: Family } = await vite.ssrLoadModule('/src/components/bearthSetupPage/BirthFamilyCard.tsx');
  const model = toGeneratedBirthCard(birthAndLifeSession());
  const html = renderToStaticMarkup(createElement(Country, { model }))
    + renderToStaticMarkup(createElement(Family, { model }));
  assert.match(html, /35\s001 USD/);
  assert.match(html, /Буддизм — 37%/);
  assert.doesNotMatch(html, /игровая модель|игровая выборка|Источник измерения|Примечание к измерению|family-model-2/);
  assert.doesNotMatch(html, /Вероятность выбора страны в текущей игре/);
});

test('existing close-people template renders actual ages, arbitrary family IDs and deceased members', async () => {
  const { default: Component } = await vite.ssrLoadModule('/src/components/gamePage/ClosePeopleTab.tsx');
  const html = renderToStaticMarkup(createElement(Component, { family: birthAndLifeSession().simulation.family }));
  assert.match(html, /Эми/);
  assert.match(html, /27 лет/);
  assert.match(html, /умер/);
  assert.match(html, /value="0"/);
  assert.equal((html.match(/<h3>Юи<\/h3>/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Рин Танака/);
});

test('existing GamePage completion template renders odd-month death and disables all time controls', async () => {
  const { default: Component } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const session = birthAndLifeSession();
  session.state.status = 'COMPLETE';
  session.state.age = 0;
  Object.assign(session.simulation, { elapsedMonths: 11, monthOfYear: 11, death: {
    elapsedMonths: 11, age: 0, cause: 'UNSPECIFIED', model: 'UN_WPP_2024_QX', note: 'Причина не определена.',
  } });
  const original = structuredClone(session);
  const html = renderToStaticMarkup(createElement(Component, {
    server: { session, busy: false, failure: null, notice: '' }, onRestart: () => {},
  }));
  assert.match(html, /Эта жизнь завершена.*0 лет, 11 мес/);
  assert.match(html, /Начать новую жизнь/);
  const pause = html.match(/<button[^>]*aria-label="Пауза"[^>]*>/)?.[0];
  assert.match(pause, /disabled=""/);
  for (const speed of [1, 2, 4, 8, 16]) {
    assert.match(html, new RegExp(`<button[^>]*disabled=""[^>]*>${speed}×<`));
  }
  assert.match(html, /value="0.9166666666666666"/);
  assert.deepEqual(session, original);
});

test('life chronicle keeps older events inside its keyboard-accessible scroll region', async () => {
  const { default: Component } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const session = birthAndLifeSession();
  session.state.history = Array.from({ length: 20 }, (_, index) => ({
    id: `event-${index}`, age: index, title: `Момент ${index}`, text: `История ${index}`,
  }));
  const html = renderToStaticMarkup(createElement(Component, {
    server: { session, busy: false, failure: null, notice: '' }, onRestart: () => {},
  }));
  assert.match(html, /role="region" aria-label="События жизни" tabindex="0"/);
  assert.equal((html.match(/<article/g) ?? []).length, 20);
  assert(html.indexOf('Момент 19') < html.indexOf('Момент 0'));
});

test('server and mock budget histories retain every operation and replace expansion with a scroll hint', async () => {
  const { default: ServerHistory } = await vite.ssrLoadModule('/src/components/gamePage/ServerFinanceHistory.tsx');
  const { default: MockFinances } = await vite.ssrLoadModule('/src/components/gamePage/FinancesTab.tsx');
  const ledger = Array.from({ length: 25 }, (_, index) => ({
    id: `operation-${index}`, month: 120 - index, age: index, kind: 'BUDGET',
    title: `Операция ${index}`, income: 200, expense: 100, expenses: 100,
  }));
  const examples = [
    renderToStaticMarkup(createElement(ServerHistory, { data: { ledger, purchases: [], currency: 'RUB' } })),
    renderToStaticMarkup(createElement(MockFinances, {
      age: 10, finances: { ledger, income: 2400, expenses: 1200, savings: 100, debt: 0, career: 'Учёба' },
    })),
  ];
  for (const html of examples) {
    assert.match(html, /role="region" aria-label="Операции бюджета" tabindex="0"/);
    assert.match(html, /Операция 24/);
    assert.doesNotMatch(html, /Показать все операции/);
    assert.match(html, /Прокрутите вниз, чтобы увидеть всю историю операций/);
  }
});
