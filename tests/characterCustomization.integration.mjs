// Explicit Docker check: node tests/characterCustomization.integration.mjs
// A separate guest owns this test life; existing user saves are never opened.
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { toCharacterParameters, toCharacterChanges } from '../src/api/characterMapper.ts';
import { canCustomizeBirth } from '../src/api/characterCustomization.ts';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';

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

const create = api.prepareGenerateLocalSession({ countryIso3: 'RUS', birthYear: 2026 });
const initial = await create.execute();
assert(canCustomizeBirth(initial));
const initialBudget = await api.getFinances(initial.id);
const { settings, stats } = toCharacterParameters(initial);
const changes = toCharacterChanges(initial, {
  ...settings, name: 'Проверка настроек фронтенда', gender: 'Женщина',
  country: 'Япония', region: 'Кансай', city: 'Кобе', family: 'Две мамы', siblings: 'Брат и сестра',
  mother: 'Врач', housing: 'Съёмная квартира', wealth: 'Обеспеченный',
  relationships: 'Тёплые и крепкие', religion: 'Буддизм', language: 'Японский',
}, { ...stats, health: 100 });
// Supported by the API, but no new controls are added to the existing editor.
changes.birthYear = 2025;
changes.birthplace ??= {};
changes.birthplace.placeType = 'URBAN';
changes.stats ??= {};
Object.assign(changes.stats, { happiness: 75, relationships: 80, aura: -10 });
const edit = api.prepareEditCharacter(initial.id, initial.version, changes);
const updated = await edit.execute();
assert.equal(updated.id, initial.id);
assert.equal(updated.version, initial.version + 1);
assert.equal(updated.simulation.elapsedMonths, 0);
assert.equal(updated.state.age, 0);
assert.equal(updated.character.birthplace.countryCode, 'JP');
assert.equal(updated.character.birthYear, 2025);
assert.equal(updated.character.gender, 'Женщина');
assert.equal(updated.character.birthFacts.countryIso3, 'JPN');
assert.equal(updated.character.birthFacts.currency, 'JPY');
assert.equal(updated.character.birthFacts.housing.source, 'user-customization');
assert.equal(updated.character.birthDetails.familyType, 'TWO_MOTHERS');
assert.equal(updated.state.stats.aura, -10);
assert.equal(updated.state.stats.relationships, 80);
assert.equal(updated.simulation.family.length, 4);
assert.equal(updated.simulation.family.filter((m) => m.role === 'mother').length, 2);
assert(updated.simulation.family.every((m) => m.id));
const requestedIds = changes.family.members.flatMap((m) => m.id ? [m.id] : []);
assert(requestedIds.every((id) => updated.simulation.family.some((m) => m.id === id)));
assert.equal(toGeneratedBirthCard(updated).members.length, 4);
assert.deepEqual(await edit.execute(), updated, 'Repeating the command cannot duplicate relatives');
assert.deepEqual(await api.getSession(initial.id), updated, 'F5 reads the full edited same-ID snapshot');
assert.deepEqual(await create.execute(), updated, 'The original creation command must not regenerate the edited life');
const budget = await api.getFinances(initial.id);
assert.equal(budget.currency, 'RUB');
assert.equal(budget.version, updated.version);
assert.deepEqual(budget.summary, initialBudget.summary, 'Wealth edits must not deposit money');
const refreshed = toCharacterParameters(updated);
assert.equal(refreshed.settings.family, 'Две мамы');
assert.equal(refreshed.settings.mother, 'Врач');
assert.equal(refreshed.settings.wealth, updated.character.birthFacts.wealth.value);
assert.deepEqual(toCharacterChanges(updated, refreshed.settings, refreshed.stats), {});

const stepped = await api.prepareProgress(updated).execute();
assert.equal(stepped.id, updated.id);
assert.equal(stepped.simulation.elapsedMonths, 2);
assert.equal(stepped.state.age, 0);
assert(!canCustomizeBirth(stepped));
await assert.rejects(api.prepareEditCharacter(stepped.id, stepped.version, {
  birthplace: { countryCode: 'RU' },
}).execute(), { code: 'BIRTH_CONFIGURATION_LOCKED' });
assert.deepEqual(await api.getSession(stepped.id), stepped);
console.log(JSON.stringify({
  sessionId: updated.id, versionAfterEdit: updated.version, monthAfterStart: stepped.simulation.elapsedMonths,
  relatives: updated.simulation.family.length, countryCurrency: updated.character.birthFacts.currency,
  budgetCurrency: budget.currency, idempotentEdit: true, restoration: true, birthLockedAfterStep: true,
}));
