import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';
import { supportedCountries } from '../src/data/supportedCountries.ts';
import { adultSession, adultFinances } from './fixtures/adultSession.mjs';

let vite;
before(async () => {
  vite = await createServer({
    cacheDir: 'node_modules/.vite-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  });
});
after(async () => { await vite?.close(); });

test('parents remain visible with either inactive contact status and move to memorial only after death', async () => {
  const { default: People } = await vite.ssrLoadModule('/src/components/gamePage/ClosePeopleTab.tsx');
  const family = adultSession().simulation.family.filter((person) =>
    ['mother-custom-id', 'father', 'friend-1', 'child-1'].includes(person.id));
  for (const status of ['RARE_CONTACT', 'NO_CONTACT']) {
    family.forEach((person) => {
      person.alive = true;
      person.contact = { status, trackedSinceMonth: 0, lastContactMonth: null, statusSinceMonth: 24, reason: 'TIME_APART' };
    });
    const before = structuredClone(family);
    const html = renderToStaticMarkup(createElement(People, { family }));
    const relatives = html.split('>Друзья</h2>')[0];
    assert.match(relatives, /Эми/);
    assert.match(relatives, /Кэн/);
    assert.match(relatives, status === 'RARE_CONTACT' ? /Редко общаемся/ : /Связь прервана/);
    assert.equal((html.match(/<article/g) ?? []).length, status === 'RARE_CONTACT' ? 3 : 2);
    assert.equal((html.split('>Друзья</h2>')[1].match(/<article/g) ?? []).length, status === 'RARE_CONTACT' ? 1 : 0);
    assert.deepEqual(family, before);
  }
  family.find((person) => person.role === 'mother').alive = false;
  const html = renderToStaticMarkup(createElement(People, { family }));
  assert.doesNotMatch(html.split('>Друзья</h2>')[0], /Эми/);
  assert.match(html.split('>Ушли из жизни</h2>')[1], /Эми/);
  assert.equal((html.match(/<article/g) ?? []).length, 2);
});

test('rare-contact friends remain visible; disconnected friends and rare-contact relatives are hidden', async () => {
  const { default: People } = await vite.ssrLoadModule('/src/components/gamePage/ClosePeopleTab.tsx');
  const { simulation } = adultSession();
  const contact = (status) => ({ status, trackedSinceMonth: 216, lastContactMonth: null, statusSinceMonth: 240, reason: 'TIME_APART' });
  simulation.family.find((p) => p.role === 'partner').contact = contact('IN_TOUCH');
  simulation.family.find((p) => p.id === 'friend-1').contact = contact('RARE_CONTACT');
  simulation.family.find((p) => p.id === 'friend-2').contact = contact('NO_CONTACT');
  simulation.family.find((p) => p.id === 'friend-1').name = 'Друг с редким общением';
  simulation.family.find((p) => p.id === 'friend-2').name = 'Друг без связи';
  simulation.family.find((p) => p.id === 'child-1').contact = contact('RARE_CONTACT');
  simulation.family.find((p) => p.id === 'child-1').name = 'Скрытый родственник';
  simulation.family.find((p) => !p.alive).contact = contact('NO_CONTACT');
  simulation.family.find((p) => p.id === 'mother-custom-id').contact = null;
  const original = structuredClone(simulation);
  const html = renderToStaticMarkup(createElement(People, { family: simulation.family, adult: simulation.adult }));
  const [family, rest] = html.split('>Друзья</h2>');
  const [friends, deceased] = rest.split('>Ушли из жизни</h2>');
  assert.match(family, /Партнёр · 30 лет · Общаемся/);
  assert.equal((friends.match(/<article/g) ?? []).length, 1);
  assert.match(friends, /Друг с редким общением/);
  assert.match(friends, /Редко общаемся/);
  assert.match(family, /Эми/);
  assert.doesNotMatch(html, /Друг без связи|Скрытый родственник|Связь прервана/);
  assert.doesNotMatch(deceased, /Связь прервана|Общаемся|Редко общаемся/);
  assert.equal((html.match(/<article/g) ?? []).length, simulation.family.length - 2);
  assert.deepEqual(simulation, original);
  const old = renderToStaticMarkup(createElement(People, { family: adultSession().simulation.family }));
  assert.doesNotMatch(old, /Общаемся|Редко общаемся|Связь прервана/);
});

test('the same hidden contact reappears after server reconnection, without removing saved data', async () => {
  const { default: People } = await vite.ssrLoadModule('/src/components/gamePage/ClosePeopleTab.tsx');
  const person = adultSession().simulation.family.find((p) => p.id === 'friend-1');
  const family = [person];
  const render = () => renderToStaticMarkup(createElement(People, { family }));
  for (const status of ['RARE_CONTACT', 'NO_CONTACT']) {
    person.contact = { status, trackedSinceMonth: 0, lastContactMonth: null, statusSinceMonth: 24, reason: 'TIME_APART' };
    assert.equal((render().match(/<article/g) ?? []).length, status === 'RARE_CONTACT' ? 1 : 0);
    assert.equal(family.length, 1);
    assert.equal(family[0].id, 'friend-1');
  }
  person.contact = { ...person.contact, status: 'IN_TOUCH', reason: 'RECONNECTED' };
  assert.match(render(), /Общаемся/);
  assert.equal((render().match(/<article/g) ?? []).length, 1);
  person.contact = null;
  assert.equal((render().match(/<article/g) ?? []).length, 1);
  delete person.contact;
  assert.equal((render().match(/<article/g) ?? []).length, 1);
});

test('adult friends use the existing friends section; duplicates and financing totals survive rendering', async () => {
  const { default: People } = await vite.ssrLoadModule('/src/components/gamePage/ClosePeopleTab.tsx');
  const { default: Summary } = await vite.ssrLoadModule('/src/components/gamePage/ServerFinanceSummary.tsx');
  const { simulation } = adultSession();
  const html = renderToStaticMarkup(createElement(People, { family: simulation.family, adult: simulation.adult }));
  const friends = html.split('>Друзья</h2>')[1].split('>Ушли из жизни</h2>')[0];
  assert.equal((friends.match(/<article/g) ?? []).length, 2);
  assert.equal((html.match(/<article/g) ?? []).length, simulation.family.length);
  assert.match(friends, /Архитектор/);
  assert.match(friends, /value="0"/);
  assert.doesNotMatch(html, /занятие при рождении/);
  const totals = renderToStaticMarkup(createElement(Summary, { data: adultFinances() }));
  assert.match(totals, /240\s000/);
  assert.doesNotMatch(totals, /340\s000/);
});

test('deceased relatives and friends appear once below living friends, preserving names and death ages', async () => {
  const { default: People } = await vite.ssrLoadModule('/src/components/gamePage/ClosePeopleTab.tsx');
  const { simulation } = adultSession();
  simulation.family.find((person) => person.id === 'friend-2').alive = false;
  const before = structuredClone(simulation);
  const html = renderToStaticMarkup(createElement(People, { family: simulation.family, adult: simulation.adult }));
  const [family, rest] = html.split('>Друзья</h2>');
  const [friends, deceased] = rest.split('>Ушли из жизни</h2>');
  assert.equal((friends.match(/<article/g) ?? []).length, 1);
  assert.equal((deceased.match(/<article/g) ?? []).length, 2);
  assert.match(friends, /value="0"/);
  assert.match(deceased, /Кэн/);
  assert.match(deceased, /Юи/);
  assert.match(deceased, /28 лет/);
  assert.match(deceased, /умерла/);
  assert.equal((deceased.match(/people__person--deceased/g) ?? []).length, 2);
  assert.doesNotMatch(family + friends, /people__person--deceased/);
  assert.equal((html.match(/<article/g) ?? []).length, simulation.family.length);
  assert.deepEqual(simulation, before);
});

test('living-only snapshots have no memorial section; a death moves the same person out of friends', async () => {
  const { default: People } = await vite.ssrLoadModule('/src/components/gamePage/ClosePeopleTab.tsx');
  const family = adultSession().simulation.family.filter((person) => person.alive);
  const render = () => renderToStaticMarkup(createElement(People, { family }));
  assert.doesNotMatch(render(), /Ушли из жизни|people__person--deceased/);
  family.find((person) => person.id === 'friend-1').alive = false;
  const html = render();
  assert.equal((html.match(/people__person--deceased/g) ?? []).length, 1);
  assert.equal((html.split('>Друзья</h2>')[1].split('>Ушли из жизни</h2>')[0].match(/<article/g) ?? []).length, 1);
});

test('adult COMPLETE uses the existing completion card beyond the mock age limit', async () => {
  const { default: Game } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const session = adultSession();
  session.state.age = 94;
  session.state.status = 'COMPLETE';
  session.state.pendingDecision = null;
  session.simulation.death = {
    age: 94, elapsedMonths: 1135, cause: 'UNSPECIFIED', model: 'UN_WPP_2024_QX', note: '',
  };
  const html = renderToStaticMarkup(createElement(Game, {
    server: { session, busy: false, failure: null, notice: '' }, onRestart: () => {},
  }));
  assert.match(html, /Эта жизнь завершена.*94 года, 7 мес/);
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-label="Пауза"/);
  assert.match(html, /Начать новую жизнь/);
});

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
