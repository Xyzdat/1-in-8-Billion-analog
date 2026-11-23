import { character, country, family, familyDetails } from './mockData';
import { countryCodes } from './parameterOptions';
import type { BirthCardMember, BirthCardModel } from '../types/birthCard';
import type { CharacterSettings, CharacterStats } from '../types/character';

export function toMockBirthCard(settings: CharacterSettings, stats: CharacterStats): BirthCardModel {
  const isOriginalCountry = settings.country === character.country;
  const siblingKinds: Record<string, string[]> = {
    'Нет': [],
    'Один брат': ['Брат'],
    'Одна сестра': ['Сестра'],
    'Брат и сестра': ['Брат', 'Сестра'],
    'Два брата': ['Брат', 'Брат'],
    'Две сестры': ['Сестра', 'Сестра'],
  };
  const selectedSiblings = siblingKinds[settings.siblings] ?? [];
  const members: BirthCardMember[] = family.flatMap((member, index) => {
    const kind = index === 0 ? 'mother' : index === 1 ? 'father' : 'sibling';
    if (kind === 'mother' && !['Полная семья', 'Только мама'].includes(settings.family)) {
      return [];
    }
    if (kind === 'father' && !['Полная семья', 'Только папа'].includes(settings.family)) {
      return [];
    }
    if (kind === 'sibling' && index - 2 >= selectedSiblings.length) {
      return [];
    }
    return [{
      id: `mock-family-${index}`,
      kind,
      title: kind === 'sibling' ? member.name.replace(/^Брат/, selectedSiblings[index - 2]) : member.name,
      description: kind === 'mother' && settings.mother !== character.mother
        ? settings.mother
        : kind === 'father' && settings.father !== character.father ? settings.father : member.description,
    }];
  });
  const currentDetails: Record<string, string> = {
    'Жильё': settings.housing,
    'Достаток': settings.wealth,
    'Отношения в семье': settings.relationships,
    'Вера семьи': settings.religion,
    'Язык в семье': settings.language,
  };
  const initialDetails: Record<string, string> = {
    'Жильё': character.housing,
    'Достаток': character.familyWealth,
    'Отношения в семье': character.relationships,
    'Вера семьи': character.religion,
    'Язык в семье': character.language,
  };

  return {
    name: settings.name,
    gender: settings.gender,
    country: settings.country,
    countryCode: countryCodes[settings.country] || character.countryCode,
    city: settings.city,
    region: `${isOriginalCountry ? character.regionType : ''} ${settings.region}`.trim(),
    birthYear: character.birthYear,
    wealth: settings.wealth,
    birthChance: isOriginalCountry ? character.birthChance : 'Нет данных',
    stats,
    members,
    familyDetails: familyDetails.map(([label, value]) => ({
      label,
      value: currentDetails[label] === initialDetails[label] ? value : currentDetails[label],
    })),
    countryDetails: country.details.map(([, label, value]) => ({ label, value: isOriginalCountry ? value : 'Нет данных' })),
    lifeExpectancy: isOriginalCountry ? country.lifeExpectancy : 'Нет данных',
    childMortality: isOriginalCountry ? country.childMortality : 'Нет данных',
  };
}
