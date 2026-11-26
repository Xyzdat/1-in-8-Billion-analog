import type { CharacterSettings, SettingKey } from '../types/character.ts';
import type { BirthFamilyChanges, BirthFamilyMemberInput, Session } from './sessionTypes.ts';
import { birthWealthValue, parentOccupationLabel } from './birthFactsPresentation.ts';

type BirthRole = BirthFamilyMemberInput['role'];

export const birthFamilyPresets: Readonly<Record<string, readonly BirthRole[]>> = {
  'Полная семья': ['mother', 'father'],
  'Только мама': ['mother'],
  'Только папа': ['father'],
  'Детский дом': [],
  'Две мамы': ['mother', 'mother'],
  'Два папы': ['father', 'father'],
};

const siblingPresets: Readonly<Record<string, readonly BirthRole[]>> = {
  'Нет': [],
  'Один брат': ['brother'],
  'Одна сестра': ['sister'],
  'Брат и сестра': ['brother', 'sister'],
  'Два брата': ['brother', 'brother'],
  'Две сестры': ['sister', 'sister'],
};

export const wealthLevels = ['Очень низкий', 'Скромный', 'Средний', 'Обеспеченный', 'Богатый'] as const;

export function canCustomizeBirth(session: Session) {
  return session.provider === 'local' && session.state.status === 'ACTIVE'
    && session.simulation?.elapsedMonths === 0;
}

export function canEditCharacterField(session: Session, key: SettingKey, settings: CharacterSettings) {
  if (session.state.status !== 'ACTIVE') return false;
  if (key === 'name') return true;
  if (!canCustomizeBirth(session) || key === 'pets') return false;
  if (key === 'father' || key === 'mother') {
    return birthFamilyPresets[settings.family]?.includes(key)
      ?? session.simulation!.family.some((member) => member.alive && member.role === key);
  }
  return true;
}

function birthMembers(session: Session): BirthFamilyMemberInput[] {
  return (session.simulation?.family ?? []).filter((member) => member.alive).flatMap((member) => {
    const role = member.role === 'sibling'
      ? member.sex === 'FEMALE' ? 'sister' : member.sex === 'MALE' ? 'brother' : null
      : member.role;
    if (!['mother', 'father', 'brother', 'sister'].includes(role ?? '')) return [];
    return [{
      id: member.id,
      role: role as BirthRole,
      name: member.name,
      ageAtBirth: member.age,
      ...(member.occupation == null ? {} : { occupation: member.occupation }),
      closeness: member.closeness,
      trust: member.trust,
    }];
  });
}

export function birthFamilySettings(session: Session): Partial<CharacterSettings> {
  if (!canCustomizeBirth(session)) return {};
  const members = birthMembers(session);
  const parentRoles = members.filter(({ role }) => role === 'mother' || role === 'father').map(({ role }) => role).sort();
  const siblingRoles = members.filter(({ role }) => role === 'brother' || role === 'sister').map(({ role }) => role).sort();
  const presetLabel = (presets: Readonly<Record<string, readonly BirthRole[]>>, roles: BirthRole[]) =>
    Object.entries(presets).find(([, preset]) => [...preset].sort().join(',') === roles.join(','))?.[0];
  const income = session.character.birthDetails?.familyIncomeQuintile;
  const parentOccupation = (role: 'mother' | 'father') => {
    const parent = members.find((member) => member.role === role);
    return parent
      ? parentOccupationLabel(session.character.birthDetails?.[role]?.occupation, parent.occupation) ?? ''
      : '';
  };
  const wealth = birthWealthValue(session.character) ?? (income == null ? undefined : wealthLevels[income - 1]);
  return {
    family: presetLabel(birthFamilyPresets, parentRoles) ?? session.character.background?.family ?? '',
    siblings: presetLabel(siblingPresets, siblingRoles) ?? `Братьев: ${siblingRoles.filter((role) => role === 'brother').length}, сестёр: ${siblingRoles.filter((role) => role === 'sister').length}`,
    mother: parentOccupation('mother'),
    father: parentOccupation('father'),
    ...(wealth === undefined ? {} : { wealth }),
  };
}

// Existing selectors describe composition, not individual relatives. Keep all
// unchanged members and their IDs; the server assigns IDs to new placeholders.
export function toBirthFamilyChanges(
  session: Session,
  before: CharacterSettings,
  settings: CharacterSettings,
): BirthFamilyChanges | undefined {
  const changes: BirthFamilyChanges = {};
  for (const key of ['housing', 'relationships', 'religion', 'language'] as const) {
    if (settings[key] !== before[key]) changes[key] = settings[key].trim();
  }
  if (settings.wealth !== before.wealth) {
    const index = wealthLevels.findIndex((label) => label === settings.wealth);
    if (index < 0) throw new Error('Выберите достаток семьи из списка.');
    changes.incomeQuintile = index + 1;
  }

  const familyChanged = settings.family !== before.family;
  const siblingsChanged = settings.siblings !== before.siblings;
  const occupationChanged = settings.mother !== before.mother || settings.father !== before.father;
  if (familyChanged || siblingsChanged || occupationChanged) {
    const current = birthMembers(session);
    const parents = current.filter(({ role }) => role === 'mother' || role === 'father');
    const siblings = current.filter(({ role }) => role === 'brother' || role === 'sister');
    const names = { mother: 'Мама', father: 'Папа', brother: 'Брат', sister: 'Сестра' };
    const replace = (members: BirthFamilyMemberInput[], roles: readonly BirthRole[], parent: boolean) => {
      const remaining = [...members];
      return roles.map((role) => {
        const index = remaining.findIndex((member) => member.role === role);
        if (index >= 0) return remaining.splice(index, 1)[0];
        return {
          role,
          name: names[role],
          ageAtBirth: parent ? Math.max(30, ...siblings.map((sibling) => sibling.ageAtBirth + 16)) : 0,
        };
      });
    };
    if (familyChanged && !Object.hasOwn(birthFamilyPresets, settings.family)) {
      throw new Error('Выберите состав семьи из списка.');
    }
    if (siblingsChanged && !Object.hasOwn(siblingPresets, settings.siblings)) {
      throw new Error('Выберите братьев и сестёр из списка.');
    }
    const newParents = familyChanged ? replace(parents, birthFamilyPresets[settings.family], true) : parents;
    const newSiblings = siblingsChanged ? replace(siblings, siblingPresets[settings.siblings], false) : siblings;
    for (const role of ['mother', 'father'] as const) {
      const parent = newParents.find((member) => member.role === role);
      if (parent && settings[role] !== before[role]) parent.occupation = settings[role].trim();
    }
    changes.members = [...newParents, ...newSiblings];
  }
  return Object.keys(changes).length > 0 ? changes : undefined;
}
