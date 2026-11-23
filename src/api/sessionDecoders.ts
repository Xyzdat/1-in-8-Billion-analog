import type { CreateSessionRequest, Session, SessionSummary } from './sessionTypes.ts';
import type { BuySpendingItemRequest, Finances, SpendingShop } from './financeTypes.ts';

type Validator = (value: unknown) => void;

function fail(): never {
  throw new Error('Данные не соответствуют Life Backend OpenAPI 0.5.0.');
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

function array(validate: Validator): Validator {
  return (value) => {
    if (!Array.isArray(value)) {
      fail();
    }
    value.forEach(validate);
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

const session = object({
  id: validateUuid,
  character,
  version: integer(1),
  savedAt,
  provider: summaryFields.provider,
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

function number(min = -Infinity): Validator {
  return (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
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
