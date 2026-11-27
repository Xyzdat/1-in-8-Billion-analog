import type { AdultLife, BirthDetails, SimulationFamilyMember } from '../api/sessionTypes.ts';
import { closePeople, siblingNames } from '../mocks/gameTabs.ts';
import { getFamilyAppearance, withFamilySkin } from './familyAppearance.ts';
import type { FamilyAppearance } from './familyAppearance.ts';
import { resolveFamilySkinTones } from './familySkin.ts';
import type { FamilySkinPerson, FamilySkinTones } from './familySkin.ts';

type Sex = 'MALE' | 'FEMALE';
type SpriteSex = 'man' | 'woman';
type ChildSex = 'boy' | 'girl';
export type FamilySpriteId = `adult-${SpriteSex}-0${1 | 2}`
  | `${ChildSex}-age-${'03' | '06' | '10'}`
  | 'newborn';

export const familySceneSize = { width: 256, height: 144 } as const;

const spriteSizes: Record<FamilySpriteId, { width: number; height: number; left: boolean }> = {
  'adult-woman-01': { width: 28, height: 56, left: false },
  'adult-woman-02': { width: 28, height: 56, left: true },
  'adult-man-01': { width: 28, height: 56, left: true },
  'adult-man-02': { width: 28, height: 56, left: false },
  'girl-age-03': { width: 18, height: 30, left: false },
  'girl-age-06': { width: 20, height: 38, left: true },
  'girl-age-10': { width: 24, height: 46, left: false },
  'boy-age-03': { width: 18, height: 30, left: true },
  'boy-age-06': { width: 20, height: 38, left: false },
  'boy-age-10': { width: 24, height: 46, left: true },
  newborn: { width: 38, height: 30, left: false },
};

export type FamilySceneSettings = {
  name: string;
  gender?: string | null;
  family?: string | null;
  siblings?: string | null;
  country?: string | null;
};

export type FamilySceneInput = {
  settings: FamilySceneSettings;
  age: number;
  family?: SimulationFamilyMember[];
  birth?: BirthDetails | null;
  mock?: boolean;
  sessionId?: string;
  countryCode?: string | null;
  adult?: AdultLife | null;
  skinTones?: FamilySkinTones;
};

type ScenePerson = {
  id: string;
  label: string;
  age: number | null;
  sex: Sex | null;
  parent: boolean;
  variant?: number;
};

export type PositionedFamilySprite = {
  id: string;
  label: string;
  sprite: FamilySpriteId;
  x: number;
  y: number;
  width: number;
  height: number;
  flip: boolean;
  appearance: FamilyAppearance;
};

const roleLabels: Record<string, string> = {
  mother: 'Мама',
  father: 'Папа',
  brother: 'Брат',
  sister: 'Сестра',
  sibling: 'Брат или сестра',
  partner: 'Партнёр',
  child: 'Ребёнок',
  grandchild: 'Внук или внучка',
  'great-grandchild': 'Правнук или правнучка',
  'in-law': 'Родственник по браку',
};

function isParent(role: string) {
  return role === 'mother' || role === 'father';
}

function sexOf(person: Pick<SimulationFamilyMember, 'role' | 'sex'>): Sex | null {
  if (person.role === 'mother' || person.role === 'sister') return 'FEMALE';
  if (person.role === 'father' || person.role === 'brother') return 'MALE';
  return person.sex ?? null;
}

function serverPeople(family: SimulationFamilyMember[]): ScenePerson[] {
  const unique = [...new Map(family.map((person) => [person.id, person])).values()]
    .sort((first, second) => first.id.localeCompare(second.id));
  // Keep deceased parents in the variant order, so surviving parents keep their appearance.
  const parents = unique.filter((person) => isParent(person.role));

  return unique.filter((person) => Object.hasOwn(roleLabels, person.role)
    && person.alive
    && (isParent(person.role) || person.contact == null || person.contact.status === 'IN_TOUCH'))
    .map((person) => ({
      id: `relative:${person.id}`,
      label: `${roleLabels[person.role]}: ${person.name}`,
      age: person.age,
      sex: sexOf(person),
      parent: isParent(person.role),
      variant: isParent(person.role)
        ? parents.filter((parent) => sexOf(parent) === sexOf(person)).findIndex((parent) => parent.id === person.id)
        : undefined,
    }));
}

function siblingSexes(value: string | null | undefined): (Sex | null)[] {
  const label = value?.trim().toLocaleLowerCase('ru') ?? '';
  const presets: Record<string, Sex[]> = {
    'брат': ['MALE'],
    'один брат': ['MALE'],
    'два брата': ['MALE', 'MALE'],
    'сестра': ['FEMALE'],
    'одна сестра': ['FEMALE'],
    'две сестры': ['FEMALE', 'FEMALE'],
    'брат и сестра': ['MALE', 'FEMALE'],
  };
  if (presets[label]) return presets[label];
  const count = /^\d+$/.test(label) ? Math.min(10, Number(label)) : 0;
  return Array.from({ length: count }, () => null);
}

function fallbackPeople({ settings, birth, age, mock }: FamilySceneInput): ScenePerson[] {
  const presets: Record<string, readonly [number, number]> = {
    'полная семья': [1, 1],
    'мать и отец': [1, 1],
    'только мама': [1, 0],
    'только папа': [0, 1],
    'две мамы': [2, 0],
    'две матери': [2, 0],
    'два папы': [0, 2],
    'два отца': [0, 2],
    'детский дом': [0, 0],
    'нет указанных родителей': [0, 0],
    'нет': [0, 0],
    'нет данных': [0, 0],
  };
  const fromType: Record<NonNullable<BirthDetails['familyType']>, readonly [number, number]> = {
    MOTHER_AND_FATHER: [1, 1],
    TWO_MOTHERS: [2, 0],
    TWO_FATHERS: [0, 2],
  };
  const counts = birth?.familyType ? fromType[birth.familyType]
    : presets[settings.family?.trim().toLocaleLowerCase('ru') ?? ''];
  const result: ScenePerson[] = [];

  for (const [index, role] of (['mother', 'father'] as const).entries()) {
    const parent = birth?.[role];
    const household = birth?.household?.[role];
    const absent = parent?.alive === false || parent?.livesWithChild === false
      || household === false || (role === 'father' && birth?.fatherPresent === false);
    const present = parent != null || household === true || (role === 'father' && birth?.fatherPresent === true);
    const count = absent ? 0 : counts?.[index] ?? (present ? 1 : 0);
    const template = mock ? closePeople.find((person) => person.id === role) : undefined;

    for (let number = 0; number < count; number += 1) {
      result.push({
        id: `birth:${role}:${number}`,
        label: template && number === 0 ? `${roleLabels[role]}: ${template.name}` : roleLabels[role],
        age: parent?.age != null ? parent.age + age : template ? template.ageAtBirth + age : 30,
        sex: role === 'mother' ? 'FEMALE' : 'MALE',
        parent: true,
        variant: number,
      });
    }
  }

  if (birth?.siblings != null) {
    birth.siblings.forEach((sibling, index) => {
      if (sibling.livesWithChild === false) return;
      result.push({
        id: `birth:sibling:${index}`,
        label: sibling.sex === 'FEMALE' ? 'Сестра' : sibling.sex === 'MALE' ? 'Брат' : roleLabels.sibling,
        age: sibling.age == null ? null : sibling.age + age,
        sex: sibling.sex ?? null,
        parent: false,
      });
    });
  } else {
    const siblingTemplate = mock ? closePeople.find((person) => person.id === 'brother') : undefined;
    const knownCount = birth?.olderSiblingCount ?? birth?.household?.siblings;
    const sexes = knownCount == null
      ? siblingSexes(settings.siblings)
      : Array.from({ length: Math.max(0, Math.min(10, knownCount)) }, () => null);
    sexes.forEach((sex, index) => {
      const role = sex === 'FEMALE' ? 'sister' : sex === 'MALE' ? 'brother' : 'sibling';
      const name = mock ? siblingNames[index] : undefined;
      result.push({
        id: `birth:sibling:${index}`,
        label: name ? `${roleLabels[role]}: ${name}` : roleLabels[role],
        age: siblingTemplate ? siblingTemplate.ageAtBirth + age : null,
        sex,
        parent: false,
      });
    });
  }
  return result;
}

function stableVariant(id: string) {
  let hash = 0;
  for (const letter of id) hash = (hash * 31 + letter.codePointAt(0)!) >>> 0;
  return hash % 2;
}

function sceneSkinTones(input: FamilySceneInput, fallback: ScenePerson[]): FamilySkinTones {
  const countryCode = input.countryCode ?? input.settings.country;
  const toSceneId = (id: string) => id === 'character' ? 'protagonist' : `relative:${id}`;
  const records: FamilySkinPerson[] = [];
  let parentIds: string[];

  if (input.family !== undefined) {
    // Family records are kept even after death or loss of contact for ancestry links.
    parentIds = input.family.filter((person) => isParent(person.role)).map((person) => toSceneId(person.id));
    for (const person of input.family) {
      const npc = input.adult?.npcs[person.id];
      const links = npc?.parentIds.length ? npc.parentIds.map(toSceneId)
        : ['brother', 'sister', 'sibling'].includes(person.role) ? parentIds
          : person.role === 'child' ? ['protagonist'] : [];
      records.push({ id: toSceneId(person.id), parentIds: links, countryCode: npc?.countryIso2 ?? countryCode });
    }
    for (const npc of Object.values(input.adult?.npcs ?? {})) {
      if (records.some((record) => record.id === toSceneId(npc.id))) continue;
      records.push({ id: toSceneId(npc.id), parentIds: npc.parentIds.map(toSceneId), countryCode: npc.countryIso2 });
    }
  } else {
    parentIds = fallback.filter((person) => person.parent).map((person) => person.id);
    for (const role of ['mother', 'father'] as const) {
      const id = `birth:${role}:0`;
      if (input.birth?.[role] != null && !parentIds.includes(id)) parentIds.push(id);
    }
    for (const id of parentIds) records.push({ id, parentIds: [], countryCode });
    for (const person of fallback.filter((member) => !member.parent)) {
      records.push({ id: person.id, parentIds, countryCode });
    }
  }

  records.push({ id: 'protagonist', parentIds, countryCode });
  return resolveFamilySkinTones(records, input.sessionId, countryCode, input.skinTones);
}

function spriteFor(person: ScenePerson): FamilySpriteId {
  const female = person.sex === 'FEMALE';
  const age = person.age ?? 6;
  if (!person.parent && age < 3) return 'newborn';
  if (person.parent || age >= 18) {
    const variant = ((person.variant ?? stableVariant(person.id)) % 2 + 1) as 1 | 2;
    return `adult-${female ? 'woman' : 'man'}-0${variant}`;
  }
  return `${female ? 'girl' : 'boy'}-age-${age < 6 ? '03' : age < 10 ? '06' : '10'}`;
}

function position(
  person: ScenePerson,
  center: number,
  floor: number,
  scale = 1,
  sessionId?: string,
): PositionedFamilySprite {
  const sprite = spriteFor(person);
  if (sprite === 'newborn' && person.id !== 'protagonist' && Math.abs(center - 128) < 12) {
    center = center < 128 ? 108 : 148;
  }
  const size = spriteSizes[sprite];
  const displayScale = scale * (sprite === 'newborn' ? 0.75 : 1);
  const width = Math.round(size.width * displayScale);
  const height = Math.round(size.height * displayScale);
  return {
    id: person.id,
    label: person.label,
    sprite,
    x: Math.round(center - width / 2),
    y: floor - height,
    width,
    height,
    flip: sprite !== 'newborn' && (center > familySceneSize.width / 2) !== size.left,
    appearance: getFamilyAppearance(sessionId, person.id),
  };
}

export function buildFamilyScene(input: FamilySceneInput): PositionedFamilySprite[] {
  const age = Number.isFinite(input.age) ? Math.max(0, input.age) : 0;
  const people = input.family !== undefined ? serverPeople(input.family) : fallbackPeople({ ...input, age });
  const parents = people.filter((person) => person.parent);
  const relatives = people.filter((person) => !person.parent);
  const positioned: PositionedFamilySprite[] = [];

  if (people.length <= 5 && parents.length <= 2 && relatives.length <= 3) {
    parents.forEach((person, index) => {
      positioned.push(position(person, parents.length === 1 ? 62 : index === 0 ? 42 : 214, 117, 1, input.sessionId));
    });
    const centers = relatives.length === 1 ? [168]
      : relatives.length === 2 ? [parents.length === 1 ? 124 : 86, 174]
        : [78, 144, 178];
    relatives.forEach((person, index) => positioned.push(position(person, centers[index], 117, 1, input.sessionId)));
  } else {
    // Group-photo rows reserve the middle of the front row for the protagonist.
    const rows = Math.ceil((people.length + 2) / 6);
    const gap = Math.min(26, Math.floor(42 / Math.max(1, rows - 1)));
    const scale = Math.min(1, Math.max(0.4, 3 / rows));
    const ordered = [...parents, ...relatives];
    let index = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < 6 && index < ordered.length; column += 1) {
        if (row === rows - 1 && (column === 2 || column === 3)) continue;
        positioned.push(position(ordered[index], 32 + column * 38.4, 116 - (rows - row - 1) * gap, scale, input.sessionId));
        index += 1;
      }
    }
  }

  const gender = input.settings.gender?.trim().toLocaleLowerCase('ru') ?? '';
  const sex = /жен|female|woman|дев|girl/.test(gender) ? 'FEMALE' : 'MALE';
  positioned.push(position({
    id: 'protagonist',
    label: input.settings.name,
    age,
    sex,
    parent: false,
    variant: 0,
  }, 128, 124, 1, input.sessionId));
  const skinTones = sceneSkinTones(input, people);
  return positioned.map((person) => ({
    ...person,
    appearance: withFamilySkin(person.appearance, skinTones[person.id]),
  }));
}
