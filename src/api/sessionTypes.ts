// Life Backend OpenAPI 0.9.1.
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

export type DecisionStatEffects = Partial<Record<keyof SessionStats, number | null>>;

export type SessionOptionEffects = {
  scope: 'IMMEDIATE';
  stats: Partial<Record<keyof SessionStats, number>>;
  closeness: Record<string, number>;
};

export type SessionDecisionOption = {
  id: string;
  label: string;
  description?: string | null;
  // Optional preview metadata; effects are applied only by the server after an answer.
  effects?: SessionOptionEffects | null;
};

export type SessionDecision = {
  id: string;
  title: string;
  // Optional display metadata; the current backend may omit these fields.
  important?: boolean | null;
  description?: string | null;
  options: SessionDecisionOption[];
};

export type SessionHistoryEvent = {
  id: string;
  age: number;
  title: string;
  text: string;
  importance?: number | null;
  importanceSource?: 'LIFE_STORY' | 'EVENT_RULE' | null;
  link?: EventLink | null;
  consequences?: {
    aura: number;
    closeness: Record<string, number>;
    // Prepared for per-event deltas; the current 0.9.0 backend omits this block.
    stats?: Partial<Record<keyof SessionStats, number>> | null;
  } | null;
};

export type HighlightOption = { id: string; label: string };

export type EventLink = {
  sourceId: string;
  templateId: string;
  domain: string;
  phase: 'OFFER' | 'DECISION' | 'OUTCOME' | 'CANCELLED';
  month: number;
  decisionId: string | null;
  optionId: string | null;
  optionLabel: string | null;
  action: string | null;
  offeredOptions: HighlightOption[];
  participantIds: string[];
  relatedSourceIds: string[];
};

export type HighlightDecision = {
  id: string;
  month: number;
  age: number;
  title: string;
  prompt: string | null;
  optionId: string;
  optionLabel: string;
  offeredOptions: HighlightOption[];
  participantIds: string[];
  historyEventId: string;
  result: string;
  statChanges: Record<string, number>;
  closenessChanges: Record<string, number>;
  balanceChange: number | null;
};

export type HighlightEvidence = {
  id: string;
  month: number;
  kind: string;
  relation: 'DIRECT' | 'SAME_STORY' | 'EXPLICIT_DEPENDENCY' | 'TRACKED_ENTITY';
  text: string;
  historyEventId: string | null;
};

export type HighlightSlide = {
  id: string;
  templateId: string;
  domain: string;
  month: number;
  age: number;
  title: string;
  importance: number;
  reasons: { code: string; points: number; text: string }[];
  decisions: HighlightDecision[];
  evidence: HighlightEvidence[];
  revisions: {
    month: number;
    previousScore: number;
    score: number;
    reasonCodes: string[];
  }[];
};

export type LifeHighlights = {
  modelVersion: 'life-highlights-1';
  status: 'LIVE' | 'FINAL';
  currency: 'RUB';
  trackedFromMonth: number;
  partialHistory: boolean;
  evaluatedThroughMonth: number;
  finalizedAtMonth: number | null;
  decisionCount: number;
  candidateCount: number;
  slides: HighlightSlide[];
};

export type SessionSummary = {
  provider: SessionProvider;
  id: string;
  name: string;
  age: number;
  status: SessionStatus;
  savedAt: string;
};

export type ContactState = {
  status: 'IN_TOUCH' | 'RARE_CONTACT' | 'NO_CONTACT';
  trackedSinceMonth: number;
  lastContactMonth: number | null;
  statusSinceMonth: number;
  reason: 'INITIALIZED' | 'INTERACTION' | 'HOUSEHOLD' | 'TIME_APART' | 'PLAYER_CHOICE' | 'RECONNECTED';
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
  contact?: ContactState | null;
};

export type SimulationDeath = {
  elapsedMonths: number;
  age: number;
  cause: 'UNSPECIFIED';
  model: 'UN_WPP_2024_QX';
  note: string;
  causeDetails?: {
    code: 'PERINATAL_COMPLICATIONS' | 'CONGENITAL_CONDITION' | 'RESPIRATORY_INFECTION'
      | 'SEVERE_INFECTION' | 'ACCIDENT' | 'HEART_ATTACK' | 'STROKE' | 'CANCER'
      | 'ACUTE_DISEASE_COMPLICATIONS' | 'CHRONIC_DISEASE_COMPLICATIONS' | 'INJURY_COMPLICATIONS';
    label: string;
    model: 'death-causes-1';
    basis: 'GAME_ASSUMPTION';
    conditionId: string | null;
  } | null;
};

export type LocalSimulation = {
  adult?: AdultLife | null;
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

export type AdultTraits = {
  diligence: number;
  sociability: number;
  openness: number;
  resilience: number;
};

export type AdultCareer = {
  status: 'UNEMPLOYED' | 'PROBATION' | 'EMPLOYED' | 'BUSINESS' | 'RETIRED';
  occupation: string | null;
  industry: string | null;
  employer: string | null;
  position: string | null;
  monthlyPay: number;
  beganMonth: number;
  experienceMonths: number;
  qualification: number;
  satisfaction: number;
  stability: number;
  risk: number;
  monthlyPension: number;
  history: {
    id: string;
    occupation: string;
    employer: string;
    beganMonth: number;
    endedMonth: number | null;
    endReason: string | null;
  }[];
};

export type AdultPartnership = {
  partnerId: string;
  status: 'DATING' | 'COHABITING' | 'MARRIED' | 'SEPARATED' | 'DIVORCED' | 'WIDOWED';
  beganMonth: number;
  cohabiting: boolean;
  satisfaction: number;
  conflict: number;
  milestones: string[];
};

export type AdultNpc = {
  id: string;
  traits: AdultTraits;
  education: string;
  occupation: string | null;
  monthlyIncome: number;
  health: number;
  maritalStatus: string;
  partnerId: string | null;
  countryIso2: string;
  parentIds: string[];
};

export type AdultCondition = {
  id: string;
  kind: 'INJURY' | 'HEALTH_CONDITION';
  onsetMonth: number;
  severity: number;
  stage: 'ACTIVE' | 'CHRONIC' | 'RECOVERED';
  treatment: 'REST' | 'SUPERVISED';
  reviewMonth: number;
  endedMonth: number | null;
  chronic: boolean;
  workCapacity: number;
};

export type AdultDebt = {
  id: string;
  kind: 'PERSONAL' | 'MORTGAGE';
  principal: number;
  annualBasisPoints: number;
  monthlyPayment: number;
  missedPayments: number;
};

export type AdultAsset = {
  id: string;
  kind: 'PROPERTY' | 'INVESTMENT';
  title: string;
  value: number;
  ownershipPercent: number;
  purchaseId: string | null;
};

export type AdultLife = {
  modelVersion: 'adult-1';
  ageStage: 'EARLY_ADULT' | 'MIDDLE_ADULT' | 'LATE_CAREER' | 'LATER_LIFE';
  currency: 'RUB';
  traits: AdultTraits;
  education: {
    level: string;
    field: string | null;
    startedMonth: number | null;
    completesMonth: number | null;
    status: string;
  };
  career: AdultCareer;
  partnership: AdultPartnership | null;
  npcs: Record<string, AdultNpc>;
  healthConditions: AdultCondition[];
  debts: AdultDebt[];
  assets: AdultAsset[];
  stories: {
    id: string;
    template: string;
    stage: string;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    beganMonth: number;
    endedMonth: number | null;
    participants: string[];
  }[];
  memories: {
    id: string;
    month: number;
    kind: string;
    personId: string | null;
    text: string;
  }[];
  housing: string;
  assumptions: string[];
};

export type Session = {
  provider: SessionProvider;
  id: string;
  character: SessionCharacter;
  version: number;
  savedAt: string;
  highlights?: LifeHighlights | null;
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
  name?: string | null;
  sex?: 'FEMALE' | 'MALE' | null;
  birthYear?: number | null;
  birthplace?: BirthplaceChanges | null;
  family?: BirthFamilyChanges | null;
  stats?: { [Key in keyof SessionStats]?: number | null } | null;
};

export type BirthplaceChanges = {
  countryCode?: typeof supportedCountries[number]['iso2'] | null;
  region?: string | null;
  city?: string | null;
  placeType?: 'URBAN' | 'RURAL' | null;
};

export type BirthFamilyMemberInput = {
  id?: string | null;
  role: 'mother' | 'father' | 'brother' | 'sister';
  name: string;
  ageAtBirth: number;
  occupation?: string | null;
  closeness?: number | null;
  trust?: number | null;
};

export type BirthFamilyChanges = {
  incomeQuintile?: number | null;
  housing?: string | null;
  relationships?: string | null;
  religion?: string | null;
  language?: string | null;
  members?: BirthFamilyMemberInput[] | null;
};
export type EditCharacterRequest = VersionedAction & { changes: CharacterChanges };
export type AnswerDecisionRequest = VersionedAction & { optionId: string };
