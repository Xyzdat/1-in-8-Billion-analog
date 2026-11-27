import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';
import { supportedCountries } from '../src/data/supportedCountries.ts';
import { adultSession, adultFinances } from './fixtures/adultSession.mjs';
import { yearFocusSession } from './fixtures/yearFocusSession.mjs';

let vite;
before(async () => {
  vite = await createServer({
    cacheDir: 'node_modules/.vite-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
    ssr: { noExternal: ['react-country-flag'] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  });
});
after(async () => { await vite?.close(); });

test('server focus uses the existing card, server context and annual effects without applying them to stats', async () => {
  const { default: Game } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const session = yearFocusSession();
  session.simulation.yearlyFocus.context = 'Школьный возраст';
  const original = structuredClone(session);
  const render = () => renderToStaticMarkup(createElement(Game, {
    server: { session, busy: false, failure: null, notice: '', changeFocus: () => {} }, onRestart: () => {},
  }));
  const html = render();
  assert.match(html, /Семья и дом/);
  assert.match(html, /Школьный возраст · Япония/);
  for (const label of ['Отношения +2', 'Интеллект −1', 'Ответственность +2', 'Близкие: +0,67']) assert(html.includes(label));
  assert.doesNotMatch(html, /1-й класс|Бонус начисляется в конце года|фокус пока недоступен/);
  assert.deepEqual(session, original);
  session.state.status = 'COMPLETE';
  assert.match(render(), /aria-expanded="false" disabled=""><span>Фокус этого года/);
  session.simulation.yearlyFocus = null;
  assert.match(render(), /Этот раздел пока недоступен для сохранённых жизней/);
});

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

test('existing birth cards display full wealth estimates and broad parent profession names without changing layout', async () => {
  const { default: Profile } = await vite.ssrLoadModule('/src/components/bearthSetupPage/BirthProfileCard.tsx');
  const { default: Family } = await vite.ssrLoadModule('/src/components/bearthSetupPage/BirthFamilyCard.tsx');
  const session = birthAndLifeSession();
  session.character.birthFacts.wealth.value = 'Низкий достаток · 0,39 среднего по стране';
  session.character.birthDetails.mother.occupation = { code: 'OCU_ISCO08_3', label: 'Специалист среднего уровня квалификации' };
  const model = toGeneratedBirthCard(session);
  const html = renderToStaticMarkup(createElement(Profile, { model }))
    + renderToStaticMarkup(createElement(Family, { model }));
  assert.equal((html.match(/Низкий достаток · 0,39 среднего по стране/g) ?? []).length, 2);
  assert.match(html, /Специалист среднего уровня квалификации/);
  assert.doesNotMatch(html, /из 5/);
  session.character.birthFacts.wealth.value = 'Ниже среднего · игровая оценка';
  const estimated = toGeneratedBirthCard(session);
  assert.match(renderToStaticMarkup(createElement(Profile, { model: estimated })), /Ниже среднего · игровая оценка/);
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

test('game retains the full server name next to the year and lists actual family members after the residence', async () => {
  const { default: Component } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const session = birthAndLifeSession();
  session.character.name = 'Арав Кумар Шарма';
  session.character.birthplace = { countryCode: 'IN', country: 'Индия', city: null };
  session.character.background.family = 'Мать и отец';
  session.character.background.housing = 'Дом в сельской местности';
  session.simulation.family.find((person) => person.role === 'father').alive = true;
  const brother = session.simulation.family.find((person) => person.role === 'brother');
  session.simulation.family.push({ ...brother, id: 'second-brother' });
  const original = structuredClone(session);
  const render = () => renderToStaticMarkup(createElement(Component, {
    server: { session, busy: false, failure: null, notice: '' }, onRestart() {},
  }));
  const html = render();
  assert.match(html, /<span title="Арав Кумар Шарма">2029.*?Арав Кумар Шарма<\/span>/);
  assert.match(html, />Индия · Дом в сельской местности · Мама, Папа, два брата, сестра<svg/);
  assert.doesNotMatch(html, />Индия · Дом в сельской местности · Мать и отец/);
  assert.deepEqual(session, original);
  session.character.name = 'Арав';
  session.simulation.family = [session.simulation.family[0]];
  const oneParent = render();
  assert.match(oneParent, /<span title="Арав">2029.*?Арав<\/span>/);
  assert.doesNotMatch(oneParent, /Кумар|Шарма/);
  assert.match(oneParent, />Индия · Дом в сельской местности · Мама<svg/);
});

test('chronicle displays stat changes below the correct event text using the existing appearance', async () => {
  const { default: Component } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const session = birthAndLifeSession();
  session.state.history = [
    { id: 'toy', age: 0, title: 'Игрушка', text: 'Папа повесил игрушку.', consequences: {
      aura: 0, closeness: {}, stats: { intelligence: 1 },
    } },
    { id: 'voice', age: 0, title: 'Знакомый голос', text: 'Мама стала говорить потише.', consequences: {
      aura: 0, closeness: {}, stats: { happiness: 1, relationships: 1, health: 0 },
    } },
  ];
  const before = structuredClone(session);
  const html = renderToStaticMarkup(createElement(Component, {
    server: { session, busy: false, failure: null, notice: '' }, onRestart() {},
  }));
  const articles = html.match(/<article[\s\S]*?<\/article>/g);
  assert.equal(articles.length, 2);
  assert.match(articles[0], /Мама стала говорить потише\.<\/p><div[^>]*><span>Счастье \+1<\/span><span>Отношения \+1<\/span>/);
  assert.match(articles[1], /Папа повесил игрушку\.<\/p><div[^>]*><span>Интеллект \+1<\/span>/);
  assert.doesNotMatch(articles[0], /Здоровье 0|Аура 0|Интеллект \+1/);
  assert.deepEqual(session, before);
});

test('event labels include negative stats, appearance and closeness while hiding zero changes', async () => {
  const { default: Component } = await vite.ssrLoadModule('/src/components/gamePage/EventConsequences.tsx');
  const html = renderToStaticMarkup(createElement(Component, {
    event: {
      changes: { health: -2, happiness: 0 }, appearance: 1, aura: -1,
      closeness: { 'same-name-1': 2, 'same-name-2': 0 }, money: { income: 100, expenses: 20 },
    },
    peopleLabels: { 'same-name-1': 'Аня', 'same-name-2': 'Аня' },
  }));
  for (const label of ['Здоровье -2', 'Внешность +1', 'Аура -1', 'Аня: близость +2', 'Доход +100 ₽', 'Расход −20 ₽']) {
    assert(html.includes(label), label);
  }
  assert.doesNotMatch(html, /Счастье 0|близость 0/);
  assert.equal(renderToStaticMarkup(createElement(Component, {
    event: { changes: { health: 0 }, aura: 0, closeness: { mother: 0 } },
  })), '');
});

test('decision heading renders the importance badge and description below the title using existing styles', async () => {
  const { default: Heading } = await vite.ssrLoadModule('/src/components/gamePage/DecisionHeading.tsx');
  const html = renderToStaticMarkup(createElement(Heading, {
    title: 'Продолжить учёбу?', text: 'Ты окончил базовое образование.',
    important: true, age: 18, year: 2044,
  }));
  assert.match(html, /Важное решение/);
  assert.match(html, /<h2 id="decision-title">Продолжить учёбу\?<\/h2><p id="decision-text">Ты окончил базовое образование\.<\/p>/);
  assert.doesNotMatch(html, /Отложить на время/, 'No unsupported server defer action');
  const ordinary = renderToStaticMarkup(createElement(Heading, {
    title: 'Чем заняться после школы?', important: false, age: 9, year: 2035,
  }));
  assert.doesNotMatch(ordinary, /Важное решение|decision-text/);
  assert.match(ordinary, /Чем заняться после школы\?/);
});

test('decision options show only received nonzero stat directions and keep mock aura previews', async () => {
  const { default: Effects } = await vite.ssrLoadModule('/src/components/gamePage/DecisionEffects.tsx');
  const effects = { health: 0, happiness: 1, intelligence: 3, relationships: -1, appearance: null, aura: -5 };
  const before = structuredClone(effects);
  const html = renderToStaticMarkup(createElement(Effects, { effects }));
  for (const label of ['Счастье ↑', 'Интеллект ↑', 'Отношения ↓', 'Аура ↓']) {
    assert(html.includes(label), label);
  }
  assert.doesNotMatch(html, /Здоровье|Внешность|undefined/);
  assert.match(html, /title="Интеллект \+3"/);
  assert.match(html, /title="Аура -5"/);
  assert.deepEqual(effects, before);
  for (const value of [undefined, null, {}, { health: 0, happiness: null }]) {
    assert.equal(renderToStaticMarkup(createElement(Effects, { effects: value })), '');
  }
  const mock = renderToStaticMarkup(createElement(Effects, { effects: { relationships: 2 }, aura: 3 }));
  assert.match(mock, /Отношения ↑/);
  assert.match(mock, /Аура ↑/);
});

test('chronicle uses exact server importance in existing event tooltips without changing stars or chronological order', async () => {
  const { default: Game } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const session = birthAndLifeSession();
  session.state.history = [
    { id: 'zero', age: 0, title: 'Нулевая оценка', text: 'Событие', importance: 0, importanceSource: 'EVENT_RULE' },
    { id: 'story', age: 1, title: 'Сюжет', text: 'Событие', importance: 21, importanceSource: 'LIFE_STORY' },
    { id: 'unknown', age: 2, title: 'Неизвестная оценка', text: 'Событие', importance: null, importanceSource: null },
  ];
  const render = () => renderToStaticMarkup(createElement(Game, {
    server: { session, busy: false, failure: null, notice: '' }, onRestart: () => {},
  }));
  const first = render();
  assert.match(first, /title="Важность события: 0 из 100"/);
  assert.match(first, /title="Важность события: 21 из 100"/);
  assert.equal((first.match(/title="Важность события:/g) ?? []).length, 2);
  assert(first.indexOf('Неизвестная оценка') < first.indexOf('Нулевая оценка'));
  assert.equal((first.match(/aria-pressed="false">☆/g) ?? []).length, 3);
  session.state.history[1].importance = 8;
  const refreshed = render();
  assert.match(refreshed, /title="Важность события: 8 из 100"/);
  assert.doesNotMatch(refreshed, /Важность события: 21/);
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
