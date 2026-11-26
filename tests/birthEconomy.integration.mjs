// Run explicitly against Docker: node tests/birthEconomy.integration.mjs
// Creates an isolated guest and test lives; never opens existing user saves.
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';
import { formatOccupationLabel } from '../src/api/birthFactsPresentation.ts';
import { toCharacterParameters, toCharacterChanges } from '../src/api/characterMapper.ts';

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

const results = [];
for (const countryIso3 of ['RUS', 'IND', 'SAU', 'NZL']) {
  const command = api.prepareGenerateLocalSession({ countryIso3, birthYear: 2026 });
  const session = await command.execute();
  const original = structuredClone(session);
  const card = toGeneratedBirthCard(session);
  const wealth = session.character.birthFacts.wealth.value;
  assert.equal(typeof wealth, 'string');
  assert.equal(card.wealth, wealth);
  assert.equal(card.familyDetails.find((row) => row.label === 'Достаток').value, wealth);
  assert.doesNotMatch(card.wealth, /₽|\$|USD|ППС|из 5/);
  if (['RUS', 'IND'].includes(countryIso3)) assert.match(wealth, /\d+,\d+ среднего по стране/);
  else assert.match(wealth, /игровая оценка/);
  for (const role of ['mother', 'father']) {
    const relative = session.simulation.family.find((person) => person.role === role);
    const member = card.members.find((person) => person.kind === role);
    if (relative) {
      assert.equal(member.description, formatOccupationLabel(session.character.birthDetails[role].occupation.label));
      assert.equal(member.description, formatOccupationLabel(relative.occupation));
      if (countryIso3 === 'SAU') assert.equal(member.description, 'Нет данных о профессии');
    } else assert.equal(member, undefined);
  }
  const { settings, stats } = toCharacterParameters(session);
  assert.equal(settings.wealth, wealth);
  assert.deepEqual(toCharacterChanges(session, settings, stats), {});
  assert.deepEqual(toCharacterChanges(session, { ...settings, name: 'Проверка только имени' }, stats), { name: 'Проверка только имени' });
  const restored = await api.getSession(session.id);
  assert.deepEqual(restored, original);
  assert.deepEqual(toGeneratedBirthCard(restored), card);
  assert.deepEqual(toCharacterParameters(restored), { settings, stats });
  assert.equal((await command.execute()).id, session.id);
  const finances = await api.getFinances(session.id);
  assert.equal(finances.currency, 'RUB');
  assert.equal(finances.summary.availableBalance, 0);
  assert.deepEqual(session, original);
  results.push({ countryIso3, id: session.id, wealth, professions: card.members
    .filter((member) => member.kind === 'mother' || member.kind === 'father')
    .map((member) => ({ role: member.kind, label: member.description })), restored: true });
}
console.log(JSON.stringify(results, null, 2));
