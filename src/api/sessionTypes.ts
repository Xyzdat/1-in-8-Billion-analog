// Life Backend OpenAPI 0.5.0.
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
};

export type SessionSummary = {
  provider: SessionProvider;
  id: string;
  name: string;
  age: number;
  status: SessionStatus;
  savedAt: string;
};

export type Session = {
  provider: SessionProvider;
  id: string;
  character: SessionCharacter;
  version: number;
  savedAt: string;
  state: {
    age: number;
    status: SessionStatus;
    stats: SessionStats;
    pendingDecision: SessionDecision | null;
    history: SessionHistoryEvent[];
  };
};

export type CreateSessionRequest = {
  character: Omit<SessionCharacter, 'birthDetails'>;
  startingStats: StartingStats;
};

export type VersionedAction = { expectedVersion: number };
export type CharacterChanges = {
  name?: string;
  stats?: Partial<StartingStats>;
};
export type EditCharacterRequest = VersionedAction & { changes: CharacterChanges };
export type AnswerDecisionRequest = VersionedAction & { optionId: string };
