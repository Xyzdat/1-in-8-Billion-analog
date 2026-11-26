import type { AdultLife, BirthDetails, ContactState, LifeHighlights, SessionDecision, SessionHistoryEvent, SimulationDeath, SimulationFamilyMember } from '../api/sessionTypes.ts';
import type { GameStats, LifeEvent } from '../mocks/lifeEvents.ts';
import { formatOccupationLabel } from '../api/birthFactsPresentation.ts';

export type HistoryStatKey = keyof GameStats | 'appearance';
export type PresentedLifeEvent = Omit<LifeEvent, 'closeness' | 'changes'>
  & Pick<SessionHistoryEvent, 'importance' | 'importanceSource'> & {
  changes: Partial<Record<HistoryStatKey, number>>;
  closeness?: Record<string, number>;
};
export type PresentedPerson = {
  id: string;
  name: string;
  role: string;
  age: number;
  alive: boolean;
  contactLabel?: string;
  occupation: string;
  icon: string;
  closeness: number;
};

const roles: Record<string, string> = {
  mother: 'Мама', father: 'Папа', brother: 'Брат', sister: 'Сестра', sibling: 'Брат / сестра',
  partner: 'Партнёр', child: 'Ребёнок', grandchild: 'Внук / внучка',
  'great-grandchild': 'Правнук / правнучка', friend: 'Друг / подруга', 'in-law': 'Родственник по браку',
};

const contactLabels: Record<ContactState['status'], string> = {
  IN_TOUCH: 'Общаемся',
  RARE_CONTACT: 'Редко общаемся',
  NO_CONTACT: 'Связь прервана',
};

type FamilySettings = {
  family?: string | null;
  mother?: string | null;
  father?: string | null;
  siblings?: string | null;
  relationships?: string | null;
};

export type FamilyFact = {
  id: string;
  label: string;
  value: string;
};

function siblingPeople(
  settings: FamilySettings,
  family?: SimulationFamilyMember[],
  birth?: BirthDetails | null,
  mockNames?: readonly string[],
) {
  type Sibling = { kind: 'brother' | 'sister' | 'unknown'; name?: string };
  let siblings: Sibling[];
  if (family !== undefined) {
    const relatives = [...new Map(family
      .filter((person) => ['brother', 'sister', 'sibling'].includes(person.role))
      .map((person) => [person.id, person])).values()];
    siblings = relatives.map((person) => ({
      kind: person.role === 'brother' || (person.role === 'sibling' && person.sex === 'MALE')
        ? 'brother'
        : person.role === 'sister' || (person.role === 'sibling' && person.sex === 'FEMALE') ? 'sister' : 'unknown',
      name: person.name.trim(),
    }));
  } else if (birth?.siblings != null) {
    siblings = birth.siblings.map((person) => ({
      kind: person.sex === 'MALE' ? 'brother' : person.sex === 'FEMALE' ? 'sister' : 'unknown',
    }));
  } else {
    const presets: Record<string, Sibling['kind'][]> = {
      'брат': ['brother'], 'один брат': ['brother'], 'два брата': ['brother', 'brother'],
      'сестра': ['sister'], 'одна сестра': ['sister'], 'две сестры': ['sister', 'sister'],
      'брат и сестра': ['brother', 'sister'],
    };
    const label = settings.siblings?.trim().toLowerCase() ?? '';
    const count = /^\d+$/.test(label) ? Number(label) : 0;
    const kinds = presets[label] ?? Array.from(
      { length: count >= 0 && count <= 10 ? count : 0 },
      () => 'unknown' as const,
    );
    siblings = kinds.map((kind, index) => ({ kind, name: mockNames?.[index] }));
  }
  return siblings;
}

function siblingFacts(
  settings: FamilySettings,
  family?: SimulationFamilyMember[],
  birth?: BirthDetails | null,
  mockNames?: readonly string[],
) {
  const siblings = siblingPeople(settings, family, birth, mockNames);
  const labels = { brother: ['Брат', 'Братья'], sister: ['Сестра', 'Сёстры'], unknown: ['Брат / сестра', 'Братья и сёстры'] };
  return (['brother', 'sister', 'unknown'] as const).flatMap((kind) => {
    const group = siblings.filter((person) => person.kind === kind);
    if (group.length === 0) return [];
    const label = labels[kind][group.length === 1 ? 0 : 1];
    const names = group.map((person) => person.name || 'имя неизвестно');
    return [{ id: `siblings-${kind}`, label, value: names.join(', ') }];
  });
}

const familySummaryLabels = {
  mother: ['Мама', 'мамы', 'мам', true],
  father: ['Папа', 'папы', 'пап', false],
  brother: ['брат', 'брата', 'братьев', false],
  sister: ['сестра', 'сестры', 'сестёр', true],
  sibling: ['брат / сестра', 'брата / сестры', 'братьев и сестёр', false],
  partner: ['партнёр', 'партнёра', 'партнёров', false],
  child: ['ребёнок', 'ребёнка', 'детей', false],
  grandchild: ['внук / внучка', 'внука / внучки', 'внуков и внучек', false],
  'great-grandchild': ['правнук / правнучка', 'правнука / правнучки', 'правнуков и правнучек', false],
  'in-law': ['родственник по браку', 'родственника по браку', 'родственников по браку', false],
} as const;

type SummaryRole = keyof typeof familySummaryLabels;
const familyCountPlural = new Intl.PluralRules('ru');

function familyCountLabel(role: SummaryRole, count: number) {
  const [single, few, many, feminine] = familySummaryLabels[role];
  if (count === 1) return single;
  const words = ['', feminine ? 'одна' : 'один', feminine ? 'две' : 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять'];
  const plural = familyCountPlural.select(count);
  const noun = plural === 'one' ? single.toLocaleLowerCase('ru') : plural === 'few' ? few : many;
  return `${words[count] ?? count} ${noun}`;
}

export function gameFamilySummary(settings: FamilySettings, family?: SimulationFamilyMember[], birth?: BirthDetails | null) {
  const counts: Partial<Record<SummaryRole, number>> = {};
  let legacyFamily: string | undefined;
  const add = (role: SummaryRole, count = 1) => {
    counts[role] = (counts[role] ?? 0) + count;
  };
  if (family !== undefined) {
    for (const person of new Map(family.map((member) => [member.id, member])).values()) {
      if (!person.alive || !Object.hasOwn(familySummaryLabels, person.role)) continue;
      const role = person.role === 'sibling'
        ? person.sex === 'MALE' ? 'brother' : person.sex === 'FEMALE' ? 'sister' : 'sibling'
        : person.role as SummaryRole;
      add(role);
    }
  } else {
    const parentPresets: Record<string, readonly [number, number]> = {
      'полная семья': [1, 1], 'мать и отец': [1, 1], 'только мама': [1, 0], 'только папа': [0, 1],
      'две мамы': [2, 0], 'две матери': [2, 0], 'два папы': [0, 2], 'два отца': [0, 2],
      'детский дом': [0, 0], 'нет указанных родителей': [0, 0],
      'нет': [0, 0], 'нет данных': [0, 0],
    };
    const birthParents = birth?.familyType === 'TWO_MOTHERS' ? [2, 0]
      : birth?.familyType === 'TWO_FATHERS' ? [0, 2]
        : birth?.familyType === 'MOTHER_AND_FATHER' ? [1, 1] : undefined;
    const parents = birthParents ?? parentPresets[settings.family?.trim().toLocaleLowerCase('ru') ?? ''];
    if (parents) {
      add('mother', parents[0]);
      add('father', parents[1]);
    } else {
      if (birth?.mother != null && birth.mother.alive !== false) add('mother');
      if (birth?.father != null && birth.father.alive !== false) add('father');
      if (!counts.mother && !counts.father) legacyFamily = settings.family?.trim() || undefined;
    }
    for (const sibling of siblingPeople(settings, undefined, birth)) {
      add(sibling.kind === 'unknown' ? 'sibling' : sibling.kind);
    }
  }
  const relatives = (Object.keys(familySummaryLabels) as SummaryRole[])
    .filter((role) => (counts[role] ?? 0) > 0)
    .map((role) => familyCountLabel(role, counts[role]!));
  return [legacyFamily, ...relatives].filter(Boolean).join(', ');
}

export function gameFamilyFacts(
  settings: FamilySettings,
  family?: SimulationFamilyMember[],
  birth?: BirthDetails | null,
  mockNames?: readonly string[],
  mockParents?: Partial<Record<'mother' | 'father', string>>,
) {
  const parents: FamilyFact[] = [];
  for (const role of ['mother', 'father'] as const) {
    const relatives = family === undefined ? undefined : [...new Map(family
      .filter((member) => member.role === role)
      .map((member) => [member.id, member])).values()];
    if (relatives !== undefined) {
      relatives.forEach((person, index) => {
        let occupation = person.occupation?.trim()
          || (index === 0 ? birth?.[role]?.occupation?.label?.trim() || settings[role]?.trim() : undefined);
        if (occupation?.startsWith(`${person.name},`)) {
          occupation = occupation.slice(person.name.length + 1).trim();
        }
        if (occupation === person.name) occupation = undefined;
        if (occupation) occupation = formatOccupationLabel(occupation);
        parents.push({
          id: person.id,
          label: role === 'mother' ? 'Мама' : 'Папа',
          value: [person.name, occupation].filter(Boolean).join(', '),
        });
      });
      continue;
    }
    if (mockParents && !mockParents[role]) continue;
    const occupation = formatOccupationLabel(birth?.[role]?.occupation?.label?.trim() || settings[role]?.trim() || '');
    const name = mockParents?.[role];
    if (name || occupation) {
      parents.push({
        id: role,
        label: role === 'mother' ? 'Мама' : 'Папа',
        value: [name, occupation].filter(Boolean).join(', '),
      });
    }
  }
  const relationships = settings.relationships?.trim().replace(/\.+$/, '');
  return [
    ...parents,
    ...siblingFacts(settings, family, birth, mockNames),
    ...(relationships ? [{ id: 'relationships', label: 'Отношения в семье', value: relationships }] : []),
  ];
}

export function toServerFamily(family: SimulationFamilyMember[], adult?: AdultLife | null): PresentedPerson[] {
  return family.map((person) => {
    const npc = adult?.npcs[person.id];
    const occupation = npc ? npc.occupation : person.occupation;
    return {
      id: person.id,
      name: person.name,
      role: [roles[person.role] ?? person.role, person.alive ? null : person.sex === 'FEMALE' ? 'умерла' : person.sex === 'MALE' ? 'умер' : 'нет в живых']
        .filter(Boolean).join(' · '),
      age: person.age,
      alive: person.alive,
      contactLabel: person.alive && person.contact ? contactLabels[person.contact.status] : undefined,
      occupation: occupation == null ? 'Нет данных о занятиях' : formatOccupationLabel(occupation),
      icon: person.role === 'mother' ? '👩' : person.role === 'father' ? '👨'
        : person.sex === 'FEMALE' ? person.age < 18 ? '👧' : '👩'
          : person.sex === 'MALE' ? person.age < 18 ? '👦' : '👨' : '👤',
      closeness: person.closeness,
    };
  });
}

export function toServerHistory(history: SessionHistoryEvent[], highlights?: LifeHighlights | null): PresentedLifeEvent[] {
  const decisions = new Map(highlights?.slides.flatMap((slide) =>
    slide.decisions.map((decision) => [decision.historyEventId, decision] as const)) ?? []);
  const statKeys: HistoryStatKey[] = ['health', 'happiness', 'intelligence', 'relationships', 'appearance'];
  // Consequences are labels only. Stats and family already contain these changes.
  return history.map((event) => {
    const decision = decisions.get(event.id);
    const deltas = event.consequences?.stats ?? decision?.statChanges;
    const changes: PresentedLifeEvent['changes'] = {};
    for (const key of statKeys) {
      const value = deltas?.[key];
      if (value !== undefined && value !== 0) changes[key] = value;
    }
    return {
      ...event,
      changes,
      aura: event.consequences?.aura ?? deltas?.aura,
      closeness: event.consequences?.closeness ?? decision?.closenessChanges,
    };
  });
}

export function toServerDecision(decision: SessionDecision, history: SessionHistoryEvent[]) {
  const offer = [...history].reverse().find((event) => event.id === decision.id
    || (event.link?.phase === 'OFFER' && event.link.decisionId === decision.id));
  return {
    title: decision.title,
    important: decision.important === true,
    text: decision.description?.trim() || offer?.text.trim() || undefined,
    options: decision.options.map((option) => ({
      id: option.id,
      title: option.label,
      description: option.description?.trim() || undefined,
      changes: option.effects == null ? undefined : { ...option.effects.stats },
      closeness: option.effects == null ? undefined : { ...option.effects.closeness },
    })),
  };
}

export function completedLifeMessage(death: SimulationDeath | null | undefined) {
  if (!death) return 'Эта жизнь завершена.';
  const plural = new Intl.PluralRules('ru').select(death.age);
  const unit = plural === 'one' ? 'год' : plural === 'few' ? 'года' : 'лет';
  return `Эта жизнь завершена. Возраст: ${death.age} ${unit}, ${death.elapsedMonths % 12} мес. ${death.note}`.trim();
}
