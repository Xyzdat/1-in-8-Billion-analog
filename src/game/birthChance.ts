import { birthStatisticsSource, countryBirths } from '../data/birthStatistics.ts';
import { supportedCountries } from '../data/supportedCountries.ts';

export const BIRTH_CHANCE_INTERVAL_MS = 4000;
export const BIRTH_CHANCE_FADE_MS = 220;

export const birthChanceCountries = supportedCountries.map((country) => ({
  ...country,
  probability: countryBirths[country.iso3] / birthStatisticsSource.worldBirths,
}));

export function formatBirthChance(probability: number) {
  if (!Number.isFinite(probability) || probability <= 0 || probability > 1) return 'Нет данных';
  const denominator = Math.round(1 / probability);
  return `1 ИЗ ${denominator.toLocaleString('ru-RU')}`;
}
