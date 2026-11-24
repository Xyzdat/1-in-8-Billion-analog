// Life Backend OpenAPI 0.7.1.
import type { supportedCountries } from '../data/supportedCountries.ts';

export type SupportedCountry = typeof supportedCountries[number]['iso3'];
export type SessionProvider = 'local' | '1in8b';
export type Background = {
  family?: string | null;
  siblings?: string | null;
  pets?: string | null;
  housing?: string | null;
  relationships?: string | null;
  father?: string | null;
  mother?: string | null;
  wealth?: string | null;
  religion?: string | null;
  language?: string | null;
};

export type SessionCharacter = {
  name: string;
  gender: string;
  birthYear: number;
  birthplace: {
    countryCode: string;
    country: string;
    region?: string | null;
    city?: string | null;
  };
  background?: Background | null;
  birthDetails?: BirthDetails | null;
  birthFacts?: BirthFacts | null;
};

export type BirthMeasure = {
  value: number;
  unit: 'probability' | 'USD_CURRENT' | 'years';
  year: number;
  source: string;
  basis: 'STATISTIC' | 'PROJECTION' | 'GAME_SELECTION';
  note: string;
};

export type BirthDescription = {
  value: string | null;
  basis: 'GAME_ASSUMPTION' | 'SAMPLED_PROXY';
  source: string;
  note: string;
};

export type BirthFacts = {
  countryIso3: SupportedCountry;
  sex: 'MALE' | 'FEMALE';
  worldBirthProbability: BirthMeasure;
  selectionProbability: BirthMeasure;
  gdpPerCapita: BirthMeasure;
  lifeExpectancy: BirthMeasure;
  underFiveMortality: BirthMeasure;
  currency: string;
  countryReligions: { code: string; percent: number }[];
  countryLanguages: { code: string; percent: number; status: string | null }[];
  wealth: BirthDescription;
  housing: BirthDescription;
  familyRelationships: BirthDescription;
  familyFaith: BirthDescription;
  familyLanguage: BirthDescription;
  sources: Record<string, string>;
};

export type ParentAtBirth = {
  age?: number | null;
  occupation?: { code: string; label: string | null } | null;
  alive?: boolean | null;
  livesWithChild?: boolean | null;
};

export type SiblingAtBirth = {
  age?: number | null;
  sex?: 'FEMALE' | 'MALE' | null;
  older?: boolean | null;
  livesWithChild?: boolean | null;
};

export type HouseholdAtBirth = {
  size?: number | null;
  mother?: boolean | null;
  father?: boolean | null;
  stepfather?: boolean | null;
  partner?: boolean | null;
  otherSpouse?: boolean | null;
  siblings?: number | null;
  children?: number | null;
  stepchildren?: number | null;
};

export type BirthCategory = { code: string; name: string | null };

export type BirthDetails = {
  placeType?: 'URBAN' | 'RURAL' | null;
  familyType?: 'MOTHER_AND_FATHER' | 'TWO_MOTHERS' | 'TWO_FATHERS' | null;
  olderSiblingCount?: number | null;
  familyIncomeQuintile?: number | null;
  fatherPresent?: boolean | null;
  mother?: ParentAtBirth | null;
  father?: ParentAtBirth | null;
  siblings?: SiblingAtBirth[] | null;
  household?: HouseholdAtBirth | null;
  homeOwned?: boolean | null;
  electricityAtHome?: boolean | null;
  faithCode?: string | null;
  group?: BirthCategory | null;
  caste?: BirthCategory | null;
  disabilityCodes?: string[] | null;
};

export type StartingStats = {
  health: number;
  intelligence: number;
  appearance: number;
};

export type SessionStats = Omit<StartingStats, 'appearance'> & {
  happiness: number;
  relationships: number;
  appearance: number | null;
  aura: number | null;
};

export type SessionStatus = 'ACTIVE' | 'COMPLETE';

export type SessionDecision = {
  id: string;
  title: string;
  options: { id: string; label: string }[];
};

export type SessionHistoryEvent = {
  id: string;
  age: number;
  title: string;
  text: string;
  consequences?: { aura: number; closeness: Record<string, number> } | null;
};

export type SessionSummary = {
  provider: SessionProvider;
  id: string;
  name: string;
  age: number;
  status: SessionStatus;
  savedAt: string;
};

export type SimulationFamilyMember = {
  id: string;
  role: string;
  name: string;
  age: number;
  alive: boolean;
  closeness: number;
  trust: number;
  sex?: 'MALE' | 'FEMALE' | null;
  occupation?: string | null;
};

export type SimulationDeath = {
  elapsedMonths: number;
  age: number;
  cause: 'UNSPECIFIED';
  model: 'UN_WPP_2024_QX';
  note: string;
};

export type LocalSimulation = {
  engineVersion: string;
  statisticsRelease: string;
  statisticsYear: number;
  elapsedMonths: number;
  monthOfYear: number;
  stepMonths: 2;
  family: SimulationFamilyMember[];
  skills: Record<string, number>;
  assumptions: string[];
  death?: SimulationDeath | null;
};

export type Session = {
  provider: SessionProvider;
  id: string;
  character: SessionCharacter;
  version: number;
  savedAt: string;
  simulation?: LocalSimulation | null;
  state: {
    age: number;
    status: SessionStatus;
    stats: SessionStats;
    pendingDecision: SessionDecision | null;
    history: SessionHistoryEvent[];
  };
};

export type CreateSessionRequest = {
  character: Omit<SessionCharacter, 'birthDetails' | 'birthFacts'>;
  startingStats: StartingStats;
};

export type VersionedAction = { expectedVersion: number };
export type GenerateLocalSessionRequest = {
  countryIso3?: SupportedCountry;
  birthYear?: number;
};
export type CharacterChanges = {
  name?: string;
  stats?: Partial<StartingStats>;
};
export type EditCharacterRequest = VersionedAction & { changes: CharacterChanges };
export type AnswerDecisionRequest = VersionedAction & { optionId: string };
