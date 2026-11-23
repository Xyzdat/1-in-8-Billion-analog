import type { CharacterSettings, CharacterStats } from '../types/character.ts';
import type { CharacterChanges, CreateSessionRequest, Session } from './sessionTypes.ts';
import { validateCreateSession } from './sessionDecoders.ts';

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
      father: background?.father ?? '',
      mother: background?.mother ?? '',
      wealth: background?.wealth ?? '',
      religion: background?.religion ?? '',
      language: background?.language ?? '',
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
  return changes;
}
