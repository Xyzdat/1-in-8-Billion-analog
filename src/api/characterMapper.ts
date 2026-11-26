import type { CharacterSettings, CharacterStats } from '../types/character.ts';
import type { CharacterChanges, CreateSessionRequest, Session } from './sessionTypes.ts';
import { validateCreateSession } from './sessionDecoders.ts';
import { supportedCountries } from '../data/supportedCountries.ts';
import { birthFamilySettings, canCustomizeBirth, toBirthFamilyChanges } from './characterCustomization.ts';
import { birthWealthValue, parentOccupationLabel } from './birthFactsPresentation.ts';

export function toCreateSessionRequest(
  settings: CharacterSettings,
  stats: CharacterStats,
  birth: { countryCode: string; birthYear: number },
): CreateSessionRequest {
  const { name, gender, country, region, city, ...background } = settings;
  const request = {
    character: {
      name,
      gender,
      birthYear: birth.birthYear,
      birthplace: { countryCode: birth.countryCode, country, region, city },
      background,
    },
    startingStats: { ...stats },
  };
  validateCreateSession(request);
  return request;
}

export function toCharacterParameters(session: Session): {
  settings: CharacterSettings;
  stats: Partial<CharacterStats>;
} {
  const { character, state } = session;
  const background = character.background;
  return {
    settings: {
      name: character.name,
      gender: character.gender,
      country: character.birthplace.country,
      region: character.birthplace.region ?? '',
      city: character.birthplace.city ?? '',
      family: background?.family ?? '',
      siblings: background?.siblings ?? '',
      pets: background?.pets ?? '',
      housing: background?.housing ?? '',
      relationships: background?.relationships ?? '',
      father: parentOccupationLabel(character.birthDetails?.father?.occupation, background?.father) ?? '',
      mother: parentOccupationLabel(character.birthDetails?.mother?.occupation, background?.mother) ?? '',
      wealth: birthWealthValue(character) ?? '',
      religion: background?.religion ?? '',
      language: background?.language ?? '',
      ...birthFamilySettings(session),
    },
    stats: {
      health: state.stats.health,
      intelligence: state.stats.intelligence,
      ...(state.stats.appearance === null ? {} : { appearance: state.stats.appearance }),
    },
  };
}

export function toCharacterChanges(
  session: Session,
  settings: CharacterSettings,
  stats: Partial<CharacterStats>,
): CharacterChanges {
  const changes: CharacterChanges = {};
  if (session.state.status !== 'ACTIVE') return changes;
  const name = settings.name.trim();
  if (name !== session.character.name) {
    changes.name = name;
  }
  const editableStats = session.provider === 'local'
    ? ['health', 'intelligence', 'appearance'] as const
    : ['appearance'] as const;
  for (const key of editableStats) {
    if (stats[key] !== undefined && stats[key] !== session.state.stats[key]) {
      changes.stats ??= {};
      changes.stats[key] = stats[key];
    }
  }
  if (canCustomizeBirth(session)) {
    const { settings: before } = toCharacterParameters(session);
    if (settings.gender !== before.gender) {
      changes.sex = settings.gender === 'Женщина' ? 'FEMALE' : 'MALE';
    }
    if (settings.country !== before.country) {
      const country = supportedCountries.find(({ name }) => name === settings.country);
      if (!country) throw new Error('Выберите поддерживаемую страну из списка.');
      changes.birthplace = { countryCode: country.iso2 };
    }
    for (const key of ['region', 'city'] as const) {
      if (settings[key] !== before[key]) {
        changes.birthplace ??= {};
        changes.birthplace[key] = settings[key].trim();
      }
    }
    const family = toBirthFamilyChanges(session, before, settings);
    if (family) changes.family = family;
  }
  return changes;
}
