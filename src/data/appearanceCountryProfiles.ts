import { supportedCountries } from './supportedCountries.ts';
import type { SupportedCountry } from '../api/sessionTypes.ts';

// Artistic priors for fictional sprites, not measured population statistics.
// Each country retains a range of possible tones; parents take priority.
type SkinWeights = readonly [number, number, number, number, number, number];

const profiles = {
  global: [17, 17, 17, 17, 16, 16],
  northern: [35, 35, 20, 7, 2, 1],
  eastern: [16, 32, 32, 15, 4, 1],
  central: [16, 30, 30, 18, 5, 1],
  southern: [2, 8, 25, 34, 23, 8],
  southeastern: [3, 15, 33, 30, 15, 4],
  western: [8, 24, 34, 24, 8, 2],
  equatorial: [1, 2, 6, 16, 35, 40],
  northeastern: [1, 3, 10, 25, 35, 26],
  southernDiverse: [16, 9, 12, 17, 25, 21],
  american: [9, 15, 26, 27, 16, 7],
  southernAmerican: [25, 26, 24, 15, 7, 3],
  diverse: [22, 22, 20, 16, 12, 8],
} as const satisfies Record<string, SkinWeights>;

const countryProfiles: Record<SupportedCountry, keyof typeof profiles> = {
  ARG: 'southernAmerican',
  AUS: 'diverse',
  BGD: 'southern',
  BRA: 'american',
  CAN: 'diverse',
  CHL: 'southernAmerican',
  CHN: 'eastern',
  COD: 'equatorial',
  COL: 'american',
  EGY: 'western',
  ETH: 'northeastern',
  GHA: 'equatorial',
  IDN: 'southeastern',
  IND: 'southern',
  IRN: 'western',
  JPN: 'eastern',
  KAZ: 'central',
  KEN: 'northeastern',
  KOR: 'eastern',
  MAR: 'western',
  MEX: 'american',
  MYS: 'southeastern',
  NGA: 'equatorial',
  NZL: 'diverse',
  PAK: 'southern',
  PER: 'american',
  PHL: 'southeastern',
  RUS: 'northern',
  SAU: 'western',
  THA: 'southeastern',
  TZA: 'northeastern',
  UGA: 'equatorial',
  USA: 'diverse',
  UZB: 'central',
  VNM: 'southeastern',
  ZAF: 'southernDiverse',
};

export function countrySkinWeights(countryCodeOrName?: string | null): SkinWeights {
  const value = countryCodeOrName?.trim().toLocaleLowerCase('ru');
  const country = supportedCountries.find((entry) => entry.iso2.toLowerCase() === value
    || entry.iso3.toLowerCase() === value || entry.name.toLocaleLowerCase('ru') === value);
  return profiles[country ? countryProfiles[country.iso3] : 'global'];
}
