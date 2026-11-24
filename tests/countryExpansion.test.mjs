import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportedCountries, supportedCountryCodes } from '../src/data/supportedCountries.ts';
import { countryCoordinates } from '../src/data/birthplaceCoordinates.ts';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';
import { decodeSession, decodeFinances, validateGenerateLocalSession } from '../src/api/sessionDecoders.ts';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';
import { formatServerMoney } from '../src/game/financePresentation.ts';

test('all 36 countries accept ISO3 generation requests and decode ISO2 birthplaces', async () => {
  assert.equal(supportedCountries.length, 36);
  assert.equal(new Set(supportedCountryCodes).size, 36);
  assert.equal(new Set(supportedCountries.map(({ iso2 }) => iso2)).size, 36);
  for (const country of supportedCountries) {
    const saved = birthAndLifeSession();
    Object.assign(saved.character.birthplace, { countryCode: country.iso2, country: country.name });
    saved.character.birthFacts.countryIso3 = country.iso3;
    const original = structuredClone(saved);
    const calls = [];
    const api = createSessionsApi(createApiClient({ baseUrl: '/api', fetcher: async (url, options) => {
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      calls.push({ url, method: options.method, body: options.body, key: options.headers.get('Idempotency-Key') });
      return Response.json(saved);
    } }));
    const command = api.prepareGenerateLocalSession({ countryIso3: country.iso3, birthYear: 2026 });
    const created = await command.execute();
    const restored = await api.getSession(created.id);
    assert.deepEqual(restored, original);
    assert.equal(restored.character.birthplace.countryCode, country.iso2);
    assert.equal(JSON.parse(calls[0].body).countryIso3, country.iso3);
    assert.equal(calls[0].url, '/api/v1/sessions/generated/local');
    assert.equal(calls[1].url, `/api/v1/sessions/${created.id}`);
    assert.equal(calls[1].method, 'GET');
    assert.match(calls[0].key, /^[0-9a-f-]{36}$/);
    assert(countryCoordinates[country.iso2], `Missing map reference for ${country.iso3}`);
    assert.equal(toGeneratedBirthCard(restored).countryCode, country.iso2);
  }
});

test('unknown, malformed and ISO2 codes fail before generation, while empty requests stay supported', () => {
  assert.doesNotThrow(() => validateGenerateLocalSession({}));
  for (const countryIso3 of ['CN', 'RU', 'FR', 'ZZZ', 'GBR', 'chn', '', null]) {
    assert.throws(() => validateGenerateLocalSession({ countryIso3 }));
    const saved = birthAndLifeSession();
    saved.character.birthFacts.countryIso3 = countryIso3;
    assert.throws(() => decodeSession(saved));
  }
  const invalid = birthAndLifeSession();
  invalid.character.birthplace.countryCode = 'CHN';
  assert.throws(() => decodeSession(invalid));
});

test('national currencies are displayed independently of the RUB or PPP game budget', () => {
  for (const [countryIso3, countryCode, currency] of [
    ['CHN', 'CN', 'CNY'], ['CAN', 'CA', 'CAD'], ['NZL', 'NZ', 'NZD'], ['ZAF', 'ZA', 'ZAR'], ['COD', 'CD', 'CDF'],
  ]) {
    const saved = birthAndLifeSession();
    Object.assign(saved.character.birthFacts, { countryIso3, currency });
    saved.character.birthplace.countryCode = countryCode;
    const card = toGeneratedBirthCard(decodeSession(saved));
    assert(card.countryDetails[2].value.includes(currency));
    const budget = decodeFinances({
      version: saved.version, age: saved.state.age, currency: 'RUB',
      summary: {
        income: 100, expenses: 0, periodMonths: 12, savings: 100, availableBalance: 100,
        debt: 0, netWorth: null, occupation: null, depositRateBasisPoints: 100, asOfAge: saved.state.age,
      },
      ledger: [], purchases: [], categories: [], location: null,
    });
    assert.equal(formatServerMoney(budget.summary.availableBalance, budget.currency), '100 ₽');
    assert.equal(formatServerMoney(100, 'PPP_USD'), '100 $ ППС');
  }
  const saved = birthAndLifeSession();
  saved.character.birthFacts.currency = 'invalid';
  assert.throws(() => decodeSession(saved));
});

test('old releases, absent facts and 1in8b outside the local country catalog remain compatible', () => {
  const saved = birthAndLifeSession();
  saved.simulation.statisticsRelease = 'birth-context-2026-v1';
  saved.character.birthFacts.selectionProbability.value = 0.17;
  const original = structuredClone(saved);
  assert.deepEqual(decodeSession(saved), original);
  for (const provider of ['local', '1in8b']) {
    for (const birthFacts of [undefined, null]) {
      const legacy = birthAndLifeSession();
      legacy.provider = provider;
      legacy.character.birthFacts = birthFacts;
      legacy.character.birthplace = { countryCode: 'FR', country: 'Франция', city: 'Париж' };
      legacy.simulation = null;
      assert.equal(decodeSession(legacy).character.birthplace.countryCode, 'FR');
    }
  }
});
