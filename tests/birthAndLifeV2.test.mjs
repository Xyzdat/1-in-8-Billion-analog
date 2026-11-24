import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';
import { localizedLanguage, formatBirthMeasure, formatCountryReligions } from '../src/api/birthFactsPresentation.ts';
import { completedLifeMessage, toServerFamily, toServerHistory } from '../src/game/serverPresentation.ts';
import { getServerClockFrame, getServerYearProgress } from '../src/game/serverClock.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { createApiClient } from '../src/api/client.ts';

test('0.7 decoder accepts complete facts, consequences and evolving engine versions without altering the snapshot', () => {
  const saved = birthAndLifeSession();
  const original = structuredClone(saved);
  assert.equal(decodeSession(saved), saved);
  assert.deepEqual(saved, original);
  for (const value of [undefined, null]) {
    saved.character.birthFacts = value;
    saved.simulation.death = value;
    for (const person of saved.simulation.family) {
      person.sex = value;
      person.occupation = value;
    }
    for (const event of saved.state.history) event.consequences = value;
    assert.doesNotThrow(() => decodeSession(saved));
  }
  saved.simulation.engineVersion = 'future-version';
  assert.doesNotThrow(() => decodeSession(saved));
});

test('0.7 decoder rejects invalid nested facts, delta maps, family sex and death metadata', () => {
  for (const mutate of [
    (s) => { s.character.birthFacts.gdpPerCapita.unit = 'PPP_USD'; },
    (s) => { s.character.birthFacts.gdpPerCapita.value = null; },
    (s) => { s.character.birthFacts.familyLanguage.basis = 'STATISTIC'; },
    (s) => { s.character.birthFacts.countryReligions[0].percent = 101; },
    (s) => { s.character.birthFacts.sources.religions = 'not a URI'; },
    (s) => { delete s.character.birthFacts.selectionProbability; },
    (s) => { s.state.history[1].consequences.aura = 201; },
    (s) => { s.state.history[1].consequences.closeness['sibling-9'] = -101; },
    (s) => { s.state.history[1].consequences.closeness = []; },
    (s) => { s.simulation.family[0].sex = 'unknown'; },
    (s) => { s.simulation.death = { elapsedMonths: 11 }; },
  ]) {
    const saved = birthAndLifeSession();
    mutate(saved);
    assert.throws(() => decodeSession(saved));
  }
});

test('birth card rounds values and omits metadata while preserving the full server snapshot', () => {
  const saved = birthAndLifeSession();
  const original = structuredClone(saved);
  const card = toGeneratedBirthCard(saved);
  assert.equal(card.birthChance, '1%');
  assert.equal(card.childMortality, '0%');
  assert.equal(card.lifeExpectancy, '85 лет');
  const details = Object.fromEntries(card.countryDetails.map(({ label, value }) => [label, value]));
  assert.match(details['ВВП на душу населения'], /^35\s001 USD$/);
  assert.doesNotMatch(details['ВВП на душу населения'], /₽|ППС/);
  assert.match(details['Валюта'], /JPY/);
  assert.equal(details['Религии страны'], 'Буддизм — 37%');
  assert.equal(card.wealth, 'Средний достаток · 3 из 5');
  assert.equal(card.familyDetails.find(({ label }) => label === 'Жильё').value, 'Квартира');
  assert.equal(card.familyDetails.find(({ label }) => label === 'Язык в семье').value, 'японский');
  assert.doesNotMatch(JSON.stringify(card), /игровая модель|игровая выборка|Источник измерения|family-model-2|Примечание к измерению/);
  assert.deepEqual(saved, original);
});

test('dominant religion is selected by original percentages and only then rounded', () => {
  const religions = [{ code: 'Muslims', percent: 79.1 }, { code: 'Hindus', percent: 79.36619 }];
  const original = structuredClone(religions);
  assert.equal(formatCountryReligions(religions), 'Индуизм — 79%');
  assert.deepEqual(religions, original);
  assert.equal(formatCountryReligions([]), 'Нет данных');
  assert.equal(formatCountryReligions([{ code: 'Other religions', percent: 0 }]), 'Другие религии — 0%');
  assert.equal(formatBirthMeasure({ value: 0.1734932766, unit: 'probability' }), '17%');
});

test('null descriptions, zero measures and unknown language codes remain explicit', () => {
  const saved = birthAndLifeSession();
  saved.character.birthFacts.wealth.value = null;
  saved.character.birthFacts.familyLanguage.value = 'zz-invalid-language';
  saved.character.birthFacts.countryReligions = [];
  saved.character.birthFacts.worldBirthProbability.value = 0;
  saved.character.birthFacts.underFiveMortality.value = 0;
  const card = toGeneratedBirthCard(saved);
  assert.match(card.birthChance, /^0%/);
  assert.match(card.childMortality, /^0%/);
  assert.equal(card.wealth, '3 из 5');
  assert.equal(card.countryDetails[0].value, 'Нет данных');
  assert.equal(localizedLanguage('not_a_language'), 'not_a_language');
  assert.match(card.familyDetails[4].value, /zz-invalid-language/);
  assert.equal(formatBirthMeasure(null), 'Нет данных');
});

test('birth card uses birth ages and names; live family uses server ages and stable arbitrary IDs', () => {
  const saved = birthAndLifeSession();
  const card = toGeneratedBirthCard(saved);
  assert.equal(card.members[0].id, 'mother-custom-id');
  assert.equal(card.members[0].title, 'Мама Эми, 24 года');
  assert.equal(card.members[0].description, 'Учитель');
  assert.match(card.members[1].description, /Не было в живых/);
  assert.equal(card.members[2].title, 'Сестра Юи, 0 лет');
  const people = toServerFamily(saved.simulation.family);
  assert.equal(people[0].age, 27);
  assert.equal(people[1].age, 28);
  assert.match(people[1].role, /умер/);
  assert.equal(people[3].id, 'sibling-9');
  assert.equal(people[3].closeness, 0);
  assert.equal(people.filter((person) => person.name === 'Юи').length, 2);
  assert.deepEqual(toServerFamily([]), []);
});

test('history consequences are presentation only, do not double-apply aura or closeness', () => {
  const saved = birthAndLifeSession();
  const original = structuredClone(saved);
  const first = toServerHistory(saved.state.history);
  assert.equal(first[1].aura, 2);
  assert.deepEqual(first[1].closeness, { 'mother-custom-id': 1, 'sibling-9': -4 });
  assert.deepEqual(toServerHistory(saved.state.history), first);
  assert.equal(saved.state.stats.aura, 100);
  assert.equal(saved.simulation.family[0].closeness, 100);
  assert.deepEqual(saved, original);
});

test('death at an odd month preserves final age and progress without forcing a whole birthday', () => {
  const saved = birthAndLifeSession();
  saved.state.status = 'COMPLETE';
  saved.state.age = 0;
  Object.assign(saved.simulation, { elapsedMonths: 11, monthOfYear: 11, death: {
    elapsedMonths: 11, age: 0, cause: 'UNSPECIFIED', model: 'UN_WPP_2024_QX', note: 'Причина не моделируется.',
  } });
  assert.equal(decodeSession(saved), saved);
  const frame = getServerClockFrame(saved);
  assert.equal(getServerYearProgress({ key: frame.key, milliseconds: 9999, playedMs: 0 }, frame, true), 11 / 12);
  assert.match(completedLifeMessage(saved.simulation.death), /0 лет, 11 мес/);
  assert.match(completedLifeMessage(saved.simulation.death), /Причина не моделируется/);
  assert.equal(completedLifeMessage(null), 'Эта жизнь завершена.');
  const old = { ...saved, simulation: null };
  assert.equal(getServerYearProgress({ key: '', milliseconds: 0, playedMs: 0 }, getServerClockFrame(old), true), 1);
});

test('answer and F5 retain the full snapshot, including nullable fields and family IDs', async () => {
  const saved = birthAndLifeSession();
  const calls = [];
  const api = createSessionsApi(createApiClient({ baseUrl: '/api', fetcher: async (url, options) => {
    if (url.endsWith('/guest')) return new Response(null, { status: 204 });
    calls.push({ url, options });
    return Response.json(saved);
  } }));
  const answered = await api.prepareAnswer(saved.id, 'decision', 'third-option', 23).execute();
  const restored = await api.getSession(saved.id);
  assert.deepEqual(answered, saved);
  assert.deepEqual(restored, answered);
  assert.equal(restored.simulation.family[3].id, 'sibling-9');
  assert.equal(restored.state.history[1].consequences.closeness['sibling-9'], -4);
  assert.deepEqual(JSON.parse(calls[0].options.body), { expectedVersion: 23, optionId: 'third-option' });
  assert.equal(calls[1].options.method, 'GET');
});
