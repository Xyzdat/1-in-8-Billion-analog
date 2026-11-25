import type { CreateSessionRequest, GenerateLocalSessionRequest, Session, SessionSummary } from './sessionTypes.ts';
import type { BuySpendingItemRequest, Finances, SpendingShop } from './financeTypes.ts';
import { supportedCountryCodes } from '../data/supportedCountries.ts';

type Validator = (value: unknown) => void;

function fail(): never {
  throw new Error('Данные не соответствуют Life Backend OpenAPI 0.8.3.');
}

function object(fields: Record<string, Validator>): Validator {
  return (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      fail();
    }
    const record = value as Record<string, unknown>;
    for (const [key, validate] of Object.entries(fields)) {
      validate(record[key]);
    }
  };
}

function text(min = 0, max = Infinity): Validator {
  return (value) => {
    if (typeof value !== 'string' || value.length < min || value.length > max) {
      fail();
    }
  };
}

function integer(min = 0, max = Number.MAX_SAFE_INTEGER): Validator {
  return (value) => {
    // int64 вне safe integer требует изменения контракта на строку.
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
      fail();
    }
  };
}

function optional(validate: Validator): Validator {
  return (value) => {
    if (value !== undefined) {
      validate(value);
    }
  };
}

function nullable(validate: Validator): Validator {
  return (value) => {
    if (value !== null) {
      validate(value);
    }
  };
}

function array(validate: Validator, min = 0, max = Infinity): Validator {
  return (value) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) {
      fail();
    }
    value.forEach(validate);
  };
}

function record(validate: Validator): Validator {
  return (value) => {
    object({})(value);
    Object.values(value as Record<string, unknown>).forEach(validate);
  };
}

export function validateUuid(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) {
    fail();
  }
}

export function validateVersion(value: number) {
  integer(1)(value);
}

const status: Validator = (value) => {
  if (value !== 'ACTIVE' && value !== 'COMPLETE') {
    fail();
  }
};

const savedAt: Validator = (value) => {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)
    || !Number.isFinite(Date.parse(value))) {
    fail();
  }
};

const background = object(Object.fromEntries([
  'family', 'siblings', 'pets', 'housing', 'relationships',
  'father', 'mother', 'wealth', 'religion', 'language',
].map((key) => [key, optional(nullable(text(0, 120)))])));

function enumeration(values: string[]): Validator {
  return (value) => {
    if (typeof value !== 'string' || !values.includes(value)) {
      fail();
    }
  };
}

const boolean: Validator = (value) => {
  if (typeof value !== 'boolean') {
    fail();
  }
};

const optionalCount = optional(nullable(integer()));
const optionalBoolean = optional(nullable(boolean));
const parentAtBirth = object({
  age: optionalCount,
  occupation: optional(nullable(object({ code: text(), label: nullable(text()) }))),
  alive: optionalBoolean,
  livesWithChild: optionalBoolean,
});
const birthCategory = object({ code: text(), name: nullable(text()) });
const birthDetails = object({
  placeType: optional(nullable(enumeration(['URBAN', 'RURAL']))),
  familyType: optional(nullable(enumeration(['MOTHER_AND_FATHER', 'TWO_MOTHERS', 'TWO_FATHERS']))),
  olderSiblingCount: optionalCount,
  familyIncomeQuintile: optional(nullable(integer(1, 5))),
  fatherPresent: optionalBoolean,
  mother: optional(nullable(parentAtBirth)),
  father: optional(nullable(parentAtBirth)),
  siblings: optional(nullable(array(object({
    age: optionalCount,
    sex: optional(nullable(enumeration(['FEMALE', 'MALE']))),
    older: optionalBoolean,
    livesWithChild: optionalBoolean,
  })))),
  household: optional(nullable(object({
    size: optionalCount,
    mother: optionalBoolean,
    father: optionalBoolean,
    stepfather: optionalBoolean,
    partner: optionalBoolean,
    otherSpouse: optionalBoolean,
    siblings: optionalCount,
    children: optionalCount,
    stepchildren: optionalCount,
  }))),
  homeOwned: optionalBoolean,
  electricityAtHome: optionalBoolean,
  faithCode: optional(nullable(text())),
  group: optional(nullable(birthCategory)),
  caste: optional(nullable(birthCategory)),
  disabilityCodes: optional(nullable(array(text()))),
});

const birthMeasure = object({
  value: number(),
  unit: enumeration(['probability', 'USD_CURRENT', 'years']),
  year: integer(Number.MIN_SAFE_INTEGER),
  source: text(),
  basis: enumeration(['STATISTIC', 'PROJECTION', 'GAME_SELECTION']),
  note: text(),
});
const birthDescription = object({
  value: nullable(text()),
  basis: enumeration(['GAME_ASSUMPTION', 'SAMPLED_PROXY']),
  source: text(),
  note: text(),
});
const birthFacts = object({
  countryIso3: enumeration(supportedCountryCodes),
  sex: enumeration(['MALE', 'FEMALE']),
  worldBirthProbability: birthMeasure,
  selectionProbability: birthMeasure,
  gdpPerCapita: birthMeasure,
  lifeExpectancy: birthMeasure,
  underFiveMortality: birthMeasure,
  currency: (value) => {
    if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) fail();
  },
  countryReligions: array(object({ code: text(), percent: number(0, 100) })),
  countryLanguages: array(object({ code: text(), percent: number(0, 100), status: nullable(text()) })),
  wealth: birthDescription,
  housing: birthDescription,
  familyRelationships: birthDescription,
  familyFaith: birthDescription,
  familyLanguage: birthDescription,
  sources: record((value) => {
    text()(value);
    try {
      new URL(value as string);
    } catch {
      fail();
    }
  }),
});

const character = object({
  name: text(1, 100),
  gender: text(1, 50),
  birthYear: integer(1, 9999),
  birthplace: object({
    countryCode: (value) => {
      if (typeof value !== 'string' || !/^[A-Z]{2}$/.test(value)) {
        fail();
      }
    },
    country: text(1, 100),
    region: optional(nullable(text(0, 100))),
    city: optional(nullable(text(0, 100))),
  }),
  background: optional(nullable(background)),
  birthDetails: optional(nullable(birthDetails)),
  birthFacts: optional(nullable(birthFacts)),
});

const startingStats = {
  health: integer(0, 100),
  intelligence: integer(0, 100),
  appearance: integer(0, 100),
};

const sessionStats = object({
  ...startingStats,
  appearance: nullable(integer(0, 100)),
  happiness: integer(0, 100),
  relationships: integer(0, 100),
  aura: nullable(integer(-100, 100)),
});

const summaryFields = {
  id: validateUuid,
  age: integer(),
  status,
  savedAt,
  provider: (value: unknown) => {
    if (value !== 'local' && value !== '1in8b') {
      fail();
    }
  },
};

const adultScore = integer(0, 100);
const adultInteger = integer(Number.MIN_SAFE_INTEGER);
const adultTraits = object({
  diligence: adultScore, sociability: adultScore, openness: adultScore, resilience: adultScore,
});
const adult = object({
  modelVersion: enumeration(['adult-1']),
  ageStage: enumeration(['EARLY_ADULT', 'MIDDLE_ADULT', 'LATE_CAREER', 'LATER_LIFE']),
  currency: enumeration(['RUB']),
  traits: adultTraits,
  education: object({
    level: text(), field: nullable(text()), startedMonth: nullable(adultInteger),
    completesMonth: nullable(adultInteger), status: text(),
  }),
  career: object({
    status: enumeration(['UNEMPLOYED', 'PROBATION', 'EMPLOYED', 'BUSINESS', 'RETIRED']),
    occupation: nullable(text()), industry: nullable(text()), employer: nullable(text()),
    position: nullable(text()), monthlyPay: number(), beganMonth: adultInteger,
    experienceMonths: integer(), qualification: integer(), satisfaction: adultScore,
    stability: adultScore, risk: adultScore, monthlyPension: number(),
    history: array(object({
      id: text(), occupation: text(), employer: text(), beganMonth: adultInteger,
      endedMonth: nullable(adultInteger), endReason: nullable(text()),
    })),
  }),
  partnership: nullable(object({
    partnerId: text(), status: enumeration(['DATING', 'COHABITING', 'MARRIED', 'SEPARATED', 'DIVORCED', 'WIDOWED']),
    beganMonth: adultInteger, cohabiting: boolean, satisfaction: adultScore,
    conflict: adultScore, milestones: array(text()),
  })),
  npcs: record(object({
    id: text(), traits: adultTraits, education: text(), occupation: nullable(text()),
    monthlyIncome: number(), health: adultScore, maritalStatus: text(),
    partnerId: nullable(text()), countryIso2: text(), parentIds: array(text()),
  })),
  healthConditions: array(object({
    id: text(), kind: enumeration(['INJURY', 'HEALTH_CONDITION']), onsetMonth: adultInteger,
    severity: adultScore, stage: enumeration(['ACTIVE', 'CHRONIC', 'RECOVERED']),
    treatment: enumeration(['REST', 'SUPERVISED']), reviewMonth: adultInteger,
    endedMonth: nullable(adultInteger), chronic: boolean, workCapacity: adultScore,
  })),
  debts: array(object({
    id: text(), kind: enumeration(['PERSONAL', 'MORTGAGE']), principal: number(),
    annualBasisPoints: adultInteger, monthlyPayment: number(), missedPayments: integer(),
  })),
  assets: array(object({
    id: text(), kind: enumeration(['PROPERTY', 'INVESTMENT']), title: text(),
    value: number(), ownershipPercent: adultScore, purchaseId: nullable(text()),
  })),
  stories: array(object({
    id: text(), template: text(), stage: text(), status: enumeration(['ACTIVE', 'COMPLETED', 'CANCELLED']),
    beganMonth: adultInteger, endedMonth: nullable(adultInteger), participants: array(text()),
  })),
  memories: array(object({
    id: text(), month: adultInteger, kind: text(), personId: nullable(text()), text: text(),
  })),
  housing: text(), assumptions: array(text()),
});

const highlightOption = object({ id: text(), label: text() });
const eventLink = object({
  sourceId: text(),
  templateId: text(),
  domain: text(),
  phase: enumeration(['OFFER', 'DECISION', 'OUTCOME', 'CANCELLED']),
  month: integer(),
  decisionId: nullable(text()),
  optionId: nullable(text()),
  optionLabel: nullable(text()),
  action: nullable(text()),
  offeredOptions: array(highlightOption),
  participantIds: array(text()),
  relatedSourceIds: array(text()),
});
const highlights = object({
  modelVersion: enumeration(['life-highlights-1']),
  status: enumeration(['LIVE', 'FINAL']),
  currency: enumeration(['RUB']),
  trackedFromMonth: integer(),
  partialHistory: boolean,
  evaluatedThroughMonth: integer(),
  finalizedAtMonth: nullable(integer()),
  decisionCount: integer(),
  candidateCount: integer(),
  slides: array(object({
    id: text(),
    templateId: text(),
    domain: text(),
    month: integer(),
    age: integer(),
    title: text(),
    importance: integer(0, 100),
    reasons: array(object({ code: text(), points: integer(), text: text() })),
    decisions: array(object({
      id: text(), month: integer(), age: integer(), title: text(),
      prompt: nullable(text()), optionId: text(), optionLabel: text(),
      offeredOptions: array(highlightOption), participantIds: array(text()),
      historyEventId: text(), result: text(),
      statChanges: record(integer(Number.MIN_SAFE_INTEGER)),
      closenessChanges: record(integer(Number.MIN_SAFE_INTEGER)),
      balanceChange: nullable(number()),
    }), 1),
    evidence: array(object({
      id: text(), month: integer(), kind: text(),
      relation: enumeration(['DIRECT', 'SAME_STORY', 'EXPLICIT_DEPENDENCY', 'TRACKED_ENTITY']),
      text: text(), historyEventId: nullable(text()),
    })),
    revisions: array(object({
      month: integer(), previousScore: integer(0, 100), score: integer(0, 100),
      reasonCodes: array(text()),
    })),
  }), 0, 12),
});

const session = object({
  id: validateUuid,
  character,
  version: integer(1),
  savedAt,
  provider: summaryFields.provider,
  highlights: optional(nullable(highlights)),
  simulation: optional(nullable(object({
    adult: optional(nullable(adult)),
    engineVersion: text(),
    statisticsRelease: text(),
    statisticsYear: integer(Number.MIN_SAFE_INTEGER),
    elapsedMonths: integer(),
    monthOfYear: integer(0, 11),
    stepMonths: integer(2, 2),
    death: optional(nullable(object({
      elapsedMonths: integer(),
      age: integer(),
      cause: enumeration(['UNSPECIFIED']),
      model: enumeration(['UN_WPP_2024_QX']),
      note: text(),
      causeDetails: optional(nullable(object({
        code: enumeration([
          'PERINATAL_COMPLICATIONS', 'CONGENITAL_CONDITION', 'RESPIRATORY_INFECTION',
          'SEVERE_INFECTION', 'ACCIDENT', 'HEART_ATTACK', 'STROKE', 'CANCER',
          'ACUTE_DISEASE_COMPLICATIONS', 'CHRONIC_DISEASE_COMPLICATIONS', 'INJURY_COMPLICATIONS',
        ]),
        label: text(),
        model: enumeration(['death-causes-1']),
        basis: enumeration(['GAME_ASSUMPTION']),
        conditionId: nullable(text()),
      }))),
    }))),
    family: array(object({
      id: text(),
      role: text(),
      name: text(),
      age: integer(),
      alive: boolean,
      closeness: integer(0, 100),
      trust: integer(0, 100),
      sex: optional(nullable(enumeration(['MALE', 'FEMALE']))),
      occupation: optional(nullable(text())),
      contact: optional(nullable(object({
        status: enumeration(['IN_TOUCH', 'RARE_CONTACT', 'NO_CONTACT']),
        trackedSinceMonth: integer(),
        lastContactMonth: nullable(integer()),
        statusSinceMonth: integer(),
        reason: enumeration(['INITIALIZED', 'INTERACTION', 'HOUSEHOLD', 'TIME_APART', 'PLAYER_CHOICE', 'RECONNECTED']),
      }))),
    })),
    skills: record(integer(0, 100)),
    assumptions: array(text()),
  }))),
  state: object({
    age: integer(),
    status,
    stats: sessionStats,
    pendingDecision: nullable(object({
      id: text(),
      title: text(),
      options: array(object({ id: text(0, 80), label: text() })),
    })),
    history: array(object({
      id: text(),
      age: integer(),
      title: text(),
      text: text(),
      link: optional(nullable(eventLink)),
      consequences: optional(nullable(object({
        aura: integer(-200, 200),
        closeness: record(integer(-100, 100)),
      }))),
    })),
  }),
});

export function decodeSession(data: unknown): Session {
  session(data);
  return data as Session;
}

export function decodeSessionList(data: unknown): SessionSummary[] {
  array(object({ ...summaryFields, name: text() }))(data);
  return data as SessionSummary[];
}

export function validateCreateSession(data: unknown): asserts data is CreateSessionRequest {
  object({ character, startingStats: object(startingStats) })(data);
}

export function validateGenerateLocalSession(data: unknown): asserts data is GenerateLocalSessionRequest {
  object({
    countryIso3: optional(enumeration(supportedCountryCodes)),
    birthYear: optional(integer(2023, 2026)),
  })(data);
}

export function validateCharacterChanges(data: unknown) {
  object({ name: optional(text(1, 100)), stats: optional(object({
    health: optional(integer(0, 100)),
    intelligence: optional(integer(0, 100)),
    appearance: optional(integer(0, 100)),
  })) })(data);
  const changes = data as { name?: string; stats?: Record<string, unknown> };
  if (Object.keys(changes).some((key) => key !== 'name' && key !== 'stats')
    || Object.keys(changes.stats ?? {}).some((key) => !(key in startingStats))
    || (changes.name !== undefined && !changes.name.trim())
    || (changes.name === undefined && !Object.values(changes.stats ?? {}).some((value) => value !== undefined))) {
    fail();
  }
}

export function decodeEmpty(data: unknown): void {
  if (data !== undefined) {
    fail();
  }
}

export function decodeHealth(data: unknown): { status: 'UP' } {
  object({ status: (value) => {
    if (value !== 'UP') {
      fail();
    }
  } })(data);
  return data as { status: 'UP' };
}

function number(min = -Infinity, max = Infinity): Validator {
  return (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      fail();
    }
  };
}

const spendingLocation = object({
  countryCode: (value) => {
    if (typeof value !== 'string' || !/^[A-Z]{2}$/.test(value)) fail();
  },
  country: text(),
  city: nullable(text()),
});
const spendingOffer = object({
  id: text(),
  title: text(),
  description: nullable(text()),
  icon: nullable(text()),
  price: number(0),
  yearlyCost: nullable(number(0)),
  durationMonths: nullable(integer(1)),
  minAge: nullable(integer()),
  effects: nullable(object(Object.fromEntries([
    'health', 'happiness', 'intelligence', 'relationships', 'appearance',
  ].map((key) => [key, optional(nullable(integer(Number.MIN_SAFE_INTEGER)))])))),
  location: nullable(spendingLocation),
  purchasable: boolean,
  unavailableReason: nullable(text()),
  balanceAfterPurchase: nullable(number(0)),
});
const spendingCategory = object({
  id: enumeration(['relationships', 'property', 'health', 'hobby', 'appearance', 'pets', 'education', 'city', 'country', 'provider']),
  groupId: text(),
  groupTitle: text(),
  title: text(),
  actionTitle: nullable(text()),
  description: nullable(text()),
  icon: nullable(text()),
  minAge: nullable(integer()),
  priceFrom: nullable(number(0)),
  actions: array(spendingOffer),
});
const financeVersion = {
  version: integer(1),
  age: integer(),
  currency: enumeration(['RUB', 'PPP_USD']),
};

export function decodeFinances(data: unknown): Finances {
  object({
    ...financeVersion,
    summary: object({
      income: nullable(number()),
      expenses: nullable(number()),
      periodMonths: nullable(integer(Number.MIN_SAFE_INTEGER)),
      savings: nullable(number()),
      debt: nullable(number()),
      availableBalance: nullable(number()),
      netWorth: nullable(number()),
      occupation: nullable(text()),
      depositRateBasisPoints: nullable(integer(Number.MIN_SAFE_INTEGER)),
      asOfAge: nullable(integer(Number.MIN_SAFE_INTEGER)),
    }),
    ledger: nullable(array(object({
      id: text(), month: integer(),
      kind: enumeration(['BUDGET', 'PURCHASE', 'UPKEEP', 'INTEREST']),
      flow: optional(nullable(enumeration(['OPERATING', 'FINANCING']))),
      title: text(), income: number(0), expense: number(0),
    }))),
    purchases: nullable(array(object({
      id: validateUuid, month: integer(), categoryId: text(), itemId: text(),
      title: text(), icon: nullable(text()), price: number(0), yearlyCost: nullable(number(0)),
      durationMonths: nullable(integer(1)), petName: nullable(text()),
      status: enumeration(['PURCHASED', 'IN_PROGRESS', 'COMPLETED']),
      location: nullable(spendingLocation),
    }))),
    categories: array(spendingCategory),
    location: nullable(spendingLocation),
  })(data);
  return data as Finances;
}

export function decodeSpendingShop(data: unknown): SpendingShop {
  object({
    ...financeVersion,
    category: spendingCategory,
    heading: text(), description: text(), confirmLabel: nullable(text()),
    availableBalance: nullable(number()), stats: sessionStats,
    suggestedPetNames: array(text()), offers: array(spendingOffer),
  })(data);
  return data as SpendingShop;
}

export function validatePurchase(data: unknown): asserts data is BuySpendingItemRequest {
  object({
    expectedVersion: integer(1), categoryId: text(1, 40), itemId: text(1, 80),
    petName: optional(nullable(text(0, 40))),
  })(data);
  const request = data as BuySpendingItemRequest;
  if (Object.keys(request).some((key) => !['expectedVersion', 'categoryId', 'itemId', 'petName'].includes(key))
    || !request.categoryId.trim() || !request.itemId.trim()
    || (request.categoryId === 'pets'
      ? !request.petName?.trim()
      : request.petName != null)
    || (request.petName != null && /\p{Cc}/u.test(request.petName))) {
    fail();
  }
}
