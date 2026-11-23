import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { birthPlaceTypeLabel, toBirthDetailRows, toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';

const birthDetails = {
  placeType: 'RURAL',
  familyType: 'MOTHER_AND_FATHER',
  olderSiblingCount: 0,
  familyIncomeQuintile: 1,
  fatherPresent: false,
  mother: {
    age: 28,
    occupation: { code: 'doctor', label: 'Врач' },
    alive: true,
    livesWithChild: true,
  },
  father: {
    age: 32,
    occupation: { code: 'unknown-job', label: null },
    alive: false,
    livesWithChild: false,
  },
  siblings: [],
  household: {
    size: 0,
    mother: true,
    father: false,
    stepfather: false,
    partner: false,
    otherSpouse: false,
    siblings: 0,
    children: 0,
    stepchildren: 0,
  },
  homeOwned: false,
  electricityAtHome: false,
  faithCode: 'none',
  group: { code: 'group-code', name: 'Название группы' },
  caste: { code: 'caste-code', name: null },
  disabilityCodes: [],
};

function session() {
  return {
    id: '12345678-1234-1234-1234-123456789abc',
    provider: '1in8b',
    character: {
      name: 'Лина',
      gender: 'Женщина',
      birthYear: 2026,
      birthplace: { countryCode: 'CA', country: 'Канада', city: '' },
      background: null,
      birthDetails: structuredClone(birthDetails),
    },
    version: 1,
    savedAt: '2026-11-23T10:00:00Z',
    state: {
      age: 0,
      status: 'ACTIVE',
      stats: { health: 60, happiness: 60, intelligence: 60, relationships: 60, appearance: null, aura: null },
      pendingDecision: null,
      history: [],
    },
  };
}

test('0.4 birth details accept full data, absent blocks, null and optional fields', () => {
  const saved = session();
  assert.equal(decodeSession(saved), saved);
  assert.deepEqual(saved.character.birthDetails, birthDetails);
  for (const details of [undefined, null, {}, Object.fromEntries(Object.keys(birthDetails).map((key) => [key, null]))]) {
    const saved = session();
    if (details === undefined) {
      delete saved.character.birthDetails;
    } else {
      saved.character.birthDetails = details;
    }
    assert.equal(decodeSession(saved), saved);
  }
  const sparse = session();
  sparse.character.birthDetails = { mother: {}, father: {}, siblings: [{}], household: {} };
  assert.equal(decodeSession(sparse), sparse);
});

test('birth details reject malformed nested values instead of treating them as absent', () => {
  for (const invalid of [
    { placeType: 'CITY' },
    { familyType: 'OTHER' },
    { olderSiblingCount: -1 },
    { familyIncomeQuintile: 0 },
    { familyIncomeQuintile: 6 },
    { fatherPresent: 0 },
    { mother: { age: 20.5 } },
    { mother: { occupation: { code: 'doctor' } } },
    { father: { alive: 'false' } },
    { siblings: [{ sex: 'OTHER' }] },
    { household: { size: '2' } },
    { group: { name: 'Группа' } },
    { caste: { code: 'code' } },
    { disabilityCodes: [false] },
  ]) {
    const saved = session();
    saved.character.birthDetails = invalid;
    assert.throws(() => decodeSession(saved), JSON.stringify(invalid));
  }
});

test('birth card preserves zero, false and empty lists without inventing rental terms', () => {
  const saved = session();
  const source = structuredClone(saved);
  const rows = Object.fromEntries(toBirthDetailRows(saved.character).map(({ id, value }) => [id, value]));
  assert.equal(birthPlaceTypeLabel(saved.character.birthDetails.placeType), 'Сельская местность');
  assert.equal(birthPlaceTypeLabel('URBAN'), 'Городская местность');
  assert.equal(birthPlaceTypeLabel(null), null);
  assert.equal(birthPlaceTypeLabel(undefined), null);
  assert.equal(saved.character.birthplace.city, '');
  assert.equal(rows.olderSiblingCount, '0');
  assert.equal(rows['siblings.count'], '0');
  assert.equal(rows.siblings, 'Нет');
  assert.equal(rows['household.size'], '0');
  assert.equal(rows['household.children'], '0');
  assert.equal(rows.fatherPresent, 'Нет');
  assert.equal(rows.electricityAtHome, 'Нет');
  assert.equal(rows.disabilityCodes, 'Нет');
  assert.equal(rows.housing, 'Нет собственного жилья');
  assert.doesNotMatch(rows.housing, /аренд|съём/i);
  assert.equal(rows.mother, 'Врач');
  assert.equal(rows.father, 'unknown-job');
  assert.equal(rows['mother.age'], '28 лет');
  assert.equal(rows['father.alive'], 'Нет');
  assert.equal(rows.group, 'Название группы');
  assert.equal(rows.caste, 'caste-code');
  assert.deepEqual(saved, source);
});

test('birth card handles sibling details and keeps background for old saves', () => {
  const saved = session();
  saved.character.birthDetails.siblings = [{ age: 0, sex: 'MALE', older: false, livesWithChild: false }];
  saved.character.birthDetails.disabilityCodes = ['code-1', 'code-2'];
  saved.character.birthDetails.homeOwned = true;
  saved.character.birthDetails.mother.age = 21;
  saved.character.background = { mother: 'Прежняя профессия', father: 'Переведённая профессия' };
  let rows = Object.fromEntries(toBirthDetailRows(saved.character).map(({ id, value }) => [id, value]));
  assert.equal(rows.mother, 'Врач');
  assert.equal(rows['mother.age'], '21 год');
  assert.equal(rows.father, 'Переведённая профессия');
  assert.equal(rows['siblings.0.age'], '0 лет');
  assert.equal(rows['siblings.0.older'], 'Нет');
  assert.equal(rows['siblings.0.livesWithChild'], 'Нет');
  assert.equal(rows.disabilityCodes, 'code-1, code-2');
  assert.equal(rows.housing, 'Собственное жильё');

  delete saved.character.birthDetails;
  rows = Object.fromEntries(toBirthDetailRows(saved.character).map(({ id, value }) => [id, value]));
  assert.equal(rows.mother, 'Прежняя профессия');
  assert.equal(rows.housing, 'Нет данных');
  assert.equal(rows['siblings.count'], undefined);
});

test('generation and restoration retain the same session and birth details without another creation', async () => {
  const saved = session();
  const calls = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      calls.push({ url, method: options.method });
      return url.endsWith('/guest')
        ? new Response(null, { status: 204 })
        : Response.json(saved);
    },
  }));
  const generated = await api.prepareGenerateSession().execute();
  const restored = await api.getSession(generated.id);
  assert.equal(generated.id, restored.id);
  assert.deepEqual(restored.character.birthDetails, birthDetails);
  assert.deepEqual(toBirthDetailRows(generated.character), toBirthDetailRows(restored.character));
  assert.deepEqual(calls.filter(({ url }) => !url.endsWith('/guest')), [
    { url: '/api/v1/sessions/generated', method: 'POST' },
    { url: `/api/v1/sessions/${saved.id}`, method: 'GET' },
  ]);
});

test('Figma card shows only design fields and preserves the complete server snapshot', () => {
  const saved = session();
  saved.character.birthDetails.siblings = [{ age: 0, sex: 'FEMALE', older: false }];
  const source = structuredClone(saved);
  const card = toGeneratedBirthCard(saved);

  assert.deepEqual(Object.keys(card.stats), ['health', 'intelligence', 'appearance']);
  assert.deepEqual(card.familyDetails.map(({ label }) => label), [
    'Жильё', 'Достаток', 'Отношения в семье', 'Вера семьи', 'Язык в семье',
  ]);
  assert.equal(card.familyDetails[0].value, 'Нет собственного жилья');
  assert.equal(card.region, 'Сельская местность');
  assert.equal(card.city, '');
  assert.equal(card.members[0].title, 'Мама, 28 лет');
  assert.equal(card.members[0].description, 'Врач');
  assert.equal(card.members[2].title, 'Сестра, 0 лет');
  assert.equal(card.stats.appearance, null);
  assert.equal(card.birthChance, 'Нет данных');
  assert.ok(card.countryDetails.every(({ value }) => value === 'Нет данных'));
  assert.equal(card.lifeExpectancy, 'Нет данных');
  assert.equal(card.childMortality, 'Нет данных');
  assert.equal(card.age, undefined);
  assert.equal(card.aura, undefined);
  assert.equal(card.household, undefined);
  assert.deepEqual(saved, source);
});

test('old saves use their own background and do not invent family members or country statistics', () => {
  const saved = session();
  saved.character.birthDetails = null;
  saved.character.birthplace.countryCode = 'JP';
  saved.character.birthplace.country = 'Япония';
  let card = toGeneratedBirthCard(saved);
  assert.deepEqual(card.members, []);
  assert.equal(card.wealth, 'Нет данных');
  assert.equal(card.region, '');
  assert.equal(card.birthChance, 'Нет данных');
  assert.ok(card.countryDetails.every(({ value }) => value === 'Нет данных'));

  saved.character.background = { mother: 'Учитель', housing: 'Дом', wealth: 'Средний', religion: 'Буддизм' };
  card = toGeneratedBirthCard(saved);
  assert.equal(card.members.length, 1);
  assert.equal(card.members[0].title, 'Мама');
  assert.equal(card.members[0].description, 'Учитель');
  assert.equal(card.familyDetails[0].value, 'Дом');
});
