import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { ApiError } from '../src/api/errors.ts';
import { validateCharacterChanges, decodeSession } from '../src/api/sessionDecoders.ts';
import { toCharacterParameters, toCharacterChanges } from '../src/api/characterMapper.ts';
import { canCustomizeBirth, canEditCharacterField } from '../src/api/characterCustomization.ts';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';
import { supportedCountries } from '../src/data/supportedCountries.ts';
import { prepareSessionMutation } from '../src/game/sessionMutation.ts';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';

function newborn() {
  const session = birthAndLifeSession();
  session.version = 1;
  session.state.age = 0;
  session.state.history = [session.state.history[0]];
  session.simulation.elapsedMonths = 0;
  session.simulation.monthOfYear = 0;
  session.simulation.family[0].age = 27;
  session.simulation.family[1].alive = true;
  session.simulation.family[1].occupation = 'Водитель';
  session.simulation.family[2].age = 0;
  session.simulation.family[3].age = 10;
  return session;
}

test('birth configuration is editable only for active newborn step sessions, not age-zero two-month saves', () => {
  const session = newborn();
  const { settings } = toCharacterParameters(session);
  assert(canCustomizeBirth(session));
  for (const key of ['name', 'gender', 'country', 'region', 'city', 'family', 'siblings', 'housing', 'relationships', 'father', 'mother', 'wealth', 'religion', 'language']) {
    assert(canEditCharacterField(session, key, settings), key);
  }
  assert(!canEditCharacterField(session, 'pets', settings));
  assert(!canEditCharacterField(session, 'father', { ...settings, family: 'Только мама' }));
  for (const mutate of [
    (s) => { s.simulation.elapsedMonths = 2; },
    (s) => { s.simulation = null; },
    (s) => { delete s.simulation; },
    (s) => { s.provider = '1in8b'; },
    (s) => { s.state.status = 'COMPLETE'; },
  ]) {
    const saved = structuredClone(session);
    mutate(saved);
    assert(!canCustomizeBirth(saved));
    assert(!canEditCharacterField(saved, 'country', settings));
    assert.equal(canEditCharacterField(saved, 'name', settings), saved.state.status === 'ACTIVE');
    const changed = toCharacterChanges(saved, { ...settings, gender: 'Женщина', country: 'Индия', family: 'Детский дом' }, {});
    assert.deepEqual(changed, {}, 'Locked birth fields must never be sent');
  }
});

test('existing editor maps all supported controls without resetting identity, unchanged family data or finances', () => {
  const session = newborn();
  const original = structuredClone(session);
  const { settings, stats } = toCharacterParameters(session);
  assert.equal(settings.family, 'Полная семья');
  assert.equal(settings.siblings, 'Брат и сестра');
  assert.equal(settings.wealth, 'Средний достаток');
  assert.equal(settings.mother, 'Учитель');
  assert.equal(settings.father, 'Водитель');
  assert.deepEqual(toCharacterChanges(session, settings, stats), {});
  const changes = toCharacterChanges(session, {
    ...settings, name: ' Мария ', gender: 'Женщина', country: 'Индия', region: 'Дели', city: 'Нью-Дели',
    mother: 'Врач', housing: 'Съёмная квартира', relationships: 'Тёплые и крепкие',
    wealth: 'Богатый', religion: 'Индуизм', language: 'Хинди', pets: 'Кошка',
  }, { health: 0, intelligence: 99, appearance: 80 });
  validateCharacterChanges(changes);
  assert.equal(changes.name, 'Мария');
  assert.equal(changes.sex, 'FEMALE');
  assert.deepEqual(changes.birthplace, { countryCode: 'IN', region: 'Дели', city: 'Нью-Дели' });
  assert.deepEqual(changes.stats, { health: 0, intelligence: 99, appearance: 80 });
  assert.equal(changes.family.incomeQuintile, 5);
  assert.equal(changes.family.housing, 'Съёмная квартира');
  assert.equal(changes.family.relationships, 'Тёплые и крепкие');
  assert.equal(changes.family.religion, 'Индуизм');
  assert.equal(changes.family.language, 'Хинди');
  assert.deepEqual(changes.family.members.map((m) => m.id), session.simulation.family.map((m) => m.id));
  assert.equal(changes.family.members[0].occupation, 'Врач');
  assert.equal(changes.family.members[1].occupation, 'Водитель');
  assert.equal(changes.family.members[3].closeness, 0);
  assert.equal(changes.family.members[3].trust, 0);
  assert.equal(changes.family.members[3].name, changes.family.members[2].name, 'Duplicate names are allowed');
  assert.deepEqual(session, original);
  assert(!('pets' in changes.family));
  assert(!('balance' in changes));
});

test('family selectors preserve surviving IDs and send new members without client IDs', () => {
  const session = newborn();
  const { settings, stats } = toCharacterParameters(session);
  const changes = toCharacterChanges(session, { ...settings, family: 'Две мамы', siblings: 'Два брата' }, stats);
  const members = changes.family.members;
  validateCharacterChanges(changes);
  assert.deepEqual(members.map((m) => m.role), ['mother', 'mother', 'brother', 'brother']);
  assert.equal(members[0].id, 'mother-custom-id');
  assert.equal(members[1].id, undefined);
  assert.equal(members[1].ageAtBirth, 30);
  assert.equal(members[2].id, 'sibling-9');
  assert.equal(members[3].id, undefined);
  assert.equal(members[3].ageAtBirth, 0);
  assert(!members.some((m) => m.id === 'father' || m.id === 'sibling-0'));
  assert.deepEqual(toCharacterChanges(session, { ...settings, family: 'Детский дом', siblings: 'Нет' }, stats), {
    family: { members: [] },
  });
  const single = toCharacterChanges(session, { ...settings, family: 'Только папа' }, stats).family.members;
  assert.deepEqual(single.map((m) => m.id), ['father', 'sibling-0', 'sibling-9']);
});

test('country edits use all 36 ISO2 codes and allow clearing location labels', () => {
  const session = newborn();
  session.character.birthplace.region = 'Хёго';
  session.character.birthplace.city = 'Кобе';
  const { settings, stats } = toCharacterParameters(session);
  for (const country of supportedCountries) {
    validateCharacterChanges({ birthplace: { countryCode: country.iso2 } });
    if (country.iso2 === 'JP') continue;
    assert.deepEqual(toCharacterChanges(session, { ...settings, country: country.name, region: '', city: '' }, stats), {
      birthplace: { countryCode: country.iso2, region: '', city: '' },
    });
  }
  assert.deepEqual(toCharacterChanges(session, { ...settings, region: '', city: '' }, stats), {
    birthplace: { region: '', city: '' },
  });
  assert.throws(() => validateCharacterChanges({ birthplace: { countryCode: 'JPN' } }));
  assert.throws(() => validateCharacterChanges({ birthplace: { countryCode: 'FR' } }));
});

test('expanded request validates ranges, null-as-unchanged, explicit empty family and unknown nested fields', () => {
  for (const changes of [
    { birthYear: 2023, sex: 'FEMALE', birthplace: { placeType: 'RURAL' } },
    { stats: { happiness: 0, relationships: 100, aura: -100 } },
    { stats: { aura: 100, health: null }, name: null, family: null, birthYear: null, sex: null, birthplace: { city: null, region: '' } },
    { family: { members: [] } },
    { family: { members: [{ role: 'father', name: 'Папа', ageAtBirth: 30, occupation: '', closeness: 0, trust: 0 }] } },
  ]) assert.doesNotThrow(() => validateCharacterChanges(changes));
  for (const changes of [
    {}, { name: null }, { stats: { health: null } }, { family: {} }, { birthplace: { city: null } },
    { stats: { aura: -101 } }, { stats: { happiness: 101 } }, { stats: { money: 1 } },
    { birthYear: 2022 }, { birthYear: 2027 }, { sex: 'Женщина' },
    { birthplace: { country: 'Япония' } }, { birthplace: { city: 'a'.repeat(101) } },
    { family: { incomeQuintile: 0 } }, { family: { housing: '' } },
    { family: { pets: 'Кошка' } }, { family: { religion: 'x'.repeat(121) } },
    { family: { members: [{ role: 'friend', name: 'Друг', ageAtBirth: 20 }] } },
    { family: { members: [{ role: 'mother', name: 'Мама', ageAtBirth: 81 }] } },
    { family: { members: [{ role: 'mother', name: 'Мама', age: 30 }] } },
  ]) assert.throws(() => validateCharacterChanges(changes), JSON.stringify(changes));
});

test('birth card uses the complete newborn family, stable IDs, same-role parents and null familyType', () => {
  const session = newborn();
  session.character.birthDetails.familyType = null;
  session.simulation.family[1].role = 'mother';
  session.simulation.family[1].name = 'Эми';
  const card = toGeneratedBirthCard(decodeSession(session));
  assert.equal(card.members.length, 4);
  assert.deepEqual(card.members.map((m) => m.id), session.simulation.family.map((m) => m.id));
  assert.equal(card.members[0].kind, 'mother');
  assert.equal(card.members[1].kind, 'mother');
  assert.match(card.members[0].title, /Мама Эми/);
  assert.match(card.members[1].title, /Мама Эми/);
  assert.equal(toCharacterParameters(session).settings.family, 'Две мамы');
  session.simulation.family = [];
  assert.deepEqual(toGeneratedBirthCard(session).members, [], 'Stale singular birthDetails must not reintroduce removed relatives');
});

test('customization retries preserve the exact family payload/key and accept the full same-ID snapshot on GET', async () => {
  const original = newborn();
  const updated = structuredClone(original);
  updated.version += 1;
  updated.character.name = 'Александра';
  const calls = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      calls.push({ url, method: options.method, body: options.body, key: options.headers.get('Idempotency-Key') });
      if (calls.length === 1) throw new TypeError('Response lost');
      return Response.json(updated);
    },
  }));
  const { settings, stats } = toCharacterParameters(original);
  const changes = toCharacterChanges(original, { ...settings, name: 'Александра', mother: 'Врач' }, stats);
  const command = api.prepareEditCharacter(original.id, original.version, changes);
  changes.family.members.length = 0;
  await assert.rejects(command.execute(), { kind: 'network' });
  assert.deepEqual(await command.execute(), updated);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(JSON.parse(calls[0].body).changes.family.members.length, 4);
  assert.equal(JSON.parse(calls[0].body).expectedVersion, original.version);
  assert.deepEqual(await api.getSession(original.id), updated);
  assert.equal(calls[2].method, 'GET');
});

test('locked configuration is reread without replaying the rejected edit, including retry of a failed GET', async () => {
  for (const code of ['BIRTH_CONFIGURATION_LOCKED', 'BIRTH_CUSTOMIZATION_UNSUPPORTED', 'CHARACTER_FIELDS_READ_ONLY', 'VERSION_CONFLICT']) {
    const original = newborn();
    const advanced = structuredClone(original);
    advanced.version += 1;
    advanced.simulation.elapsedMonths = 2;
    let commands = 0;
    let reads = 0;
    const execute = prepareSessionMutation(original, () => ({ execute: async () => {
      commands += 1;
      throw new ApiError('Rejected', 'http', 409, { code });
    } }), async () => {
      reads += 1;
      if (reads === 1) throw new ApiError('Offline', 'network');
      return advanced;
    });
    await assert.rejects(execute(new AbortController().signal), { kind: 'network' });
    const result = await execute(new AbortController().signal);
    assert.equal(result.rejectedCode, code);
    assert.equal(result.session.id, original.id);
    assert(!canCustomizeBirth(result.session));
    assert.equal(commands, 1);
    assert.equal(reads, 2);
  }
});
