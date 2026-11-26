import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthChanceCountries, formatBirthChance } from '../src/game/birthChance.ts';
import { birthStatisticsSource, countryBirths } from '../src/data/birthStatistics.ts';
import { supportedCountries } from '../src/data/supportedCountries.ts';

test('country previews use the global birth share for all 36 countries, rather than the game selection share', () => {
  assert.equal(birthChanceCountries.length, supportedCountries.length);
  assert.equal(Object.keys(countryBirths).length, 36);
  for (const country of birthChanceCountries) {
    assert(country.probability > 0 && country.probability < 1);
    assert.equal(country.probability, countryBirths[country.iso3] / birthStatisticsSource.worldBirths);
  }
  assert.equal(formatBirthChance(birthChanceCountries.find((country) => country.iso2 === 'CA').probability), '1 ИЗ 367');
  assert.equal(formatBirthChance(birthChanceCountries.find((country) => country.iso2 === 'IN').probability), '1 ИЗ 6');
  assert.equal(formatBirthChance(birthChanceCountries.find((country) => country.iso2 === 'JP').probability), '1 ИЗ 178');
  assert.equal(birthStatisticsSource.year, 2026);
  assert.match(birthStatisticsSource.source, /UN WPP 2024/);
});

test('birth chance formatting rounds the reciprocal and handles missing or invalid probabilities', () => {
  assert.equal(formatBirthChance(1), '1 ИЗ 1');
  assert.equal(formatBirthChance(0.1), '1 ИЗ 10');
  for (const probability of [0, -0.1, 1.1, NaN, Infinity, undefined, null]) {
    assert.equal(formatBirthChance(probability), 'Нет данных');
  }
});
