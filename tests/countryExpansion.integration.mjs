// Run explicitly with Docker: node tests/countryExpansion.integration.mjs
// Creates local saves under a separate guest; never calls the external engine.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { supportedCountries, supportedCountryCodes } from '../src/data/supportedCountries.ts';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';

const contract = await readFile(new URL('../../life-backend/docs/openapi.yaml', import.meta.url), 'utf8');
const declared = contract.match(/SupportedCountry:\s*\r?\n[\s\S]*?enum:\s*\[([^\]]+)\]/);
assert(declared, 'SupportedCountry enum missing from OpenAPI');
assert.deepEqual(supportedCountryCodes, declared[1].split(',').map((code) => code.trim()));

let cookie = '';
let generationCalls = 0;
const api = createSessionsApi(createApiClient({
  baseUrl: 'http://127.0.0.1:8081/api',
  fetcher: async (url, options) => {
    if (url.endsWith('/generated/local')) generationCalls += 1;
    const headers = new Headers(options.headers);
    if (cookie) headers.set('Cookie', cookie);
    const response = await fetch(url, { ...options, headers });
    const owner = response.headers.getSetCookie().find((value) => value.startsWith('life_owner='));
    if (owner) cookie = owner.split(';')[0];
    return response;
  },
}));
const currencies = new Set();
const sessionIds = new Set();
for (const country of supportedCountries) {
  const command = api.prepareGenerateLocalSession({ countryIso3: country.iso3 });
  const saved = await command.execute();
  assert.equal(saved.provider, 'local');
  assert.equal(saved.character.birthFacts.countryIso3, country.iso3);
  assert.equal(saved.character.birthplace.countryCode, country.iso2);
  assert.equal(saved.character.birthplace.country, country.name);
  assert.equal(saved.simulation.statisticsRelease, 'birth-context-2026-v2');
  assert.equal(saved.character.birthFacts.selectionProbability.value, 1);
  const repeated = await command.execute();
  assert.deepEqual(repeated, saved);
  const callsBeforeGet = generationCalls;
  const restored = await api.getSession(saved.id);
  assert.equal(generationCalls, callsBeforeGet);
  assert.deepEqual(restored, saved);
  const card = toGeneratedBirthCard(restored);
  assert.equal(card.countryCode, country.iso2);
  assert(card.countryDetails[2].value.includes(saved.character.birthFacts.currency));
  const budget = await api.getFinances(saved.id);
  assert.equal(budget.currency, 'RUB');
  currencies.add(saved.character.birthFacts.currency);
  sessionIds.add(saved.id);
}
assert.equal(sessionIds.size, 36);
const random = await api.prepareGenerateLocalSession().execute();
assert(supportedCountryCodes.includes(random.character.birthFacts.countryIso3));
assert.deepEqual(await api.getSession(random.id), random);
console.log(JSON.stringify({ result: 'PASS', countries: sessionIds.size, matchesOpenApi: true,
  restoredSameSession: true, idempotency: true, nationalCurrencies: [...currencies],
  gameCurrency: 'RUB', randomGeneration: 'PASS' }, null, 2));
