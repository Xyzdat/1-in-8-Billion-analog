import type { Background, BirthDetails, Session, SessionCharacter } from './sessionTypes.ts';
import type { BirthCardMember, BirthCardModel } from '../types/birthCard.ts';

export type BirthDetailRow = {
  id: string;
  label: string;
  value: string;
};

const backgroundLabels: Record<keyof Background, string> = {
  family: 'Семья',
  siblings: 'Братья и сёстры',
  pets: 'Домашние животные',
  housing: 'Жильё',
  relationships: 'Отношения в семье',
  father: 'Профессия отца',
  mother: 'Профессия матери',
  wealth: 'Достаток',
  religion: 'Вера семьи',
  language: 'Язык семьи',
};

const familyTypes = {
  MOTHER_AND_FATHER: 'Мать и отец',
  TWO_MOTHERS: 'Две матери',
  TWO_FATHERS: 'Два отца',
};

const agePluralRules = new Intl.PluralRules('ru');

function ageLabel(age: number | null | undefined) {
  if (age == null) {
    return null;
  }
  const plural = agePluralRules.select(age);
  const unit = plural === 'one' ? 'год' : plural === 'few' ? 'года' : 'лет';
  return `${age} ${unit}`;
}

export function birthPlaceTypeLabel(type: BirthDetails['placeType']) {
  return type === 'URBAN' ? 'Городская местность' : type === 'RURAL' ? 'Сельская местность' : null;
}

export function toBirthDetailRows(character: SessionCharacter): BirthDetailRow[] {
  const { background, birthDetails: details } = character;
  const overrides: Partial<Record<keyof Background, string>> = {};
  if (details?.familyType != null) {
    overrides.family = familyTypes[details.familyType];
  }
  for (const key of ['mother', 'father'] as const) {
    const occupation = details?.[key]?.occupation;
    if (occupation) {
      overrides[key] = occupation.label ?? background?.[key] ?? occupation.code;
    }
  }
  if (details?.homeOwned != null) {
    overrides.housing = details.homeOwned ? 'Собственное жильё' : 'Нет собственного жилья';
  }
  if (details?.siblings != null) {
    overrides.siblings = details.siblings.length === 0 ? 'Нет' : String(details.siblings.length);
  }
  const rows: BirthDetailRow[] = (Object.keys(backgroundLabels) as (keyof Background)[]).map((key) => ({
    id: key,
    label: backgroundLabels[key],
    value: overrides[key] ?? background?.[key] ?? 'Нет данных',
  }));
  if (!details) {
    return rows;
  }

  function add(id: string, label: string, value: string | number | boolean | null | undefined) {
    if (value !== null && value !== undefined) {
      rows.push({ id, label, value: typeof value === 'boolean' ? value ? 'Да' : 'Нет' : String(value) });
    }
  }

  add('olderSiblingCount', 'Старших братьев и сестёр', details.olderSiblingCount);
  add('familyIncomeQuintile', 'Доходная группа семьи (от 1 до 5)', details.familyIncomeQuintile);
  add('fatherPresent', 'Отец присутствует в семье', details.fatherPresent);
  for (const key of ['mother', 'father'] as const) {
    const parent = details[key];
    const label = key === 'mother' ? 'Мать' : 'Отец';
    add(`${key}.age`, `${label}: возраст при рождении ребёнка`, ageLabel(parent?.age));
    add(`${key}.alive`, key === 'mother' ? 'Мать жива на момент рождения' : 'Отец жив на момент рождения', parent?.alive);
    add(`${key}.livesWithChild`, `${label}: проживает с ребёнком`, parent?.livesWithChild);
  }
  if (details.siblings != null) {
    add('siblings.count', 'Братьев и сестёр при рождении', details.siblings.length);
    details.siblings.forEach((sibling, index) => {
      const prefix = `siblings.${index}`;
      const label = `Брат / сестра ${index + 1}`;
      add(`${prefix}.age`, `${label}: возраст`, ageLabel(sibling.age));
      add(`${prefix}.sex`, `${label}: пол`, sibling.sex == null ? null : sibling.sex === 'FEMALE' ? 'Женский' : 'Мужской');
      add(`${prefix}.older`, `${label}: старше персонажа`, sibling.older);
      add(`${prefix}.livesWithChild`, `${label}: проживает с ребёнком`, sibling.livesWithChild);
    });
  }
  const householdLabels = {
    size: 'Человек в домохозяйстве',
    mother: 'Мать в домохозяйстве',
    father: 'Отец в домохозяйстве',
    stepfather: 'Отчим в домохозяйстве',
    partner: 'Партнёр в домохозяйстве',
    otherSpouse: 'Другой супруг в домохозяйстве',
    siblings: 'Братьев и сестёр в домохозяйстве',
    children: 'Детей в домохозяйстве',
    stepchildren: 'Пасынков и падчериц в домохозяйстве',
  };
  for (const key of Object.keys(householdLabels) as (keyof typeof householdLabels)[]) {
    add(`household.${key}`, householdLabels[key], details.household?.[key]);
  }
  add('electricityAtHome', 'Электричество в доме', details.electricityAtHome);
  add('faithCode', 'Код вероисповедания', details.faithCode);
  add('group', 'Группа', details.group == null ? null : details.group.name ?? details.group.code);
  add('caste', 'Каста', details.caste == null ? null : details.caste.name ?? details.caste.code);
  add('disabilityCodes', 'Коды ограничений здоровья при рождении', details.disabilityCodes == null
    ? null
    : details.disabilityCodes.length === 0 ? 'Нет' : details.disabilityCodes.join(', '));
  return rows;
}

// На карточке остаются только поля из Frame. Полный снимок хранится в Session.
export function toGeneratedBirthCard(session: Session): BirthCardModel {
  const { character, state } = session;
  const { background, birthDetails: details, birthplace } = character;
  const rows = toBirthDetailRows(character);
  const values = Object.fromEntries(rows.map(({ id, value }) => [id, value]));
  const members: BirthCardMember[] = [];
  for (const key of ['mother', 'father'] as const) {
    const parent = details?.[key];
    if (parent == null && background?.[key] == null) {
      continue;
    }
    const title = key === 'mother' ? 'Мама' : 'Папа';
    members.push({
      id: key,
      kind: key,
      title: [title, ageLabel(parent?.age)].filter((value) => value != null).join(', '),
      description: values[key],
    });
  }
  details?.siblings?.forEach((sibling, index) => {
    const title = sibling.sex === 'MALE' ? 'Брат' : sibling.sex === 'FEMALE' ? 'Сестра' : 'Брат / сестра';
    members.push({
      id: `sibling-${index}`,
      kind: 'sibling',
      title: [title, ageLabel(sibling.age)].filter((value) => value != null).join(', '),
      description: 'Нет данных о занятиях',
    });
  });

  return {
    name: character.name,
    gender: character.gender,
    country: birthplace.country,
    countryCode: birthplace.countryCode,
    city: birthplace.city ?? '',
    region: [birthplace.region, birthPlaceTypeLabel(details?.placeType)].filter(Boolean).join(' · '),
    birthYear: String(character.birthYear),
    wealth: details?.familyIncomeQuintile == null ? background?.wealth ?? 'Нет данных' : `${details.familyIncomeQuintile} из 5`,
    birthChance: 'Нет данных',
    stats: {
      health: state.stats.health,
      intelligence: state.stats.intelligence,
      appearance: state.stats.appearance,
    },
    members,
    familyDetails: [
      { label: 'Жильё', value: values.housing },
      { label: 'Достаток', value: values.wealth },
      { label: 'Отношения в семье', value: values.relationships },
      { label: 'Вера семьи', value: values.religion },
      { label: 'Язык в семье', value: values.language },
    ],
    countryDetails: [
      { label: 'Религии страны', value: 'Нет данных' },
      { label: 'ВВП на душу населения', value: 'Нет данных' },
      { label: 'Валюта', value: 'Нет данных' },
    ],
    lifeExpectancy: 'Нет данных',
    childMortality: 'Нет данных',
  };
}
