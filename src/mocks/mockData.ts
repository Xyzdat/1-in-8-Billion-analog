import louisaImage from '../assets/figma-louisa.png';
import genevaImage from '../assets/figma-geneva.png';
import jacquelineImage from '../assets/figma-jacqueline.png';
import heartIcon from '../assets/setup-heart.png';
import brainIcon from '../assets/setup-brain.png';
import fireIcon from '../assets/setup-fire.png';

export type Life = {
  id: number;
  name: string;
  years: string;
  country: string;
  description: string;
  image: string;
};

export const character = {
  name: 'Юи Ватанабе',
  gender: 'Женщина',
  countryCode: 'JP',
  country: 'Япония',
  city: 'Кобе',
  region: 'Хёго',
  regionType: 'префектура',
  birthYear: '2026',
  birthChance: '1 из 1400',
  family: 'Полная семья',
  siblings: 'Один брат',
  pets: 'Нет',
  housing: 'Съёмная квартира',
  relationships: 'Тёплые и крепкие',
  father: 'Механик',
  mother: 'Медсестра',
  familyWealth: 'Скромный',
  religion: 'Буддизм',
  language: 'Японский',
  stats: {
    health: 91,
    intelligence: 72,
    appearance: 64,
  },
};

export const initialStats = { ...character.stats };

export const initialSettings = {
  name: character.name,
  gender: character.gender,
  country: character.country,
  region: character.region,
  city: character.city,
  family: character.family,
  siblings: character.siblings,
  pets: character.pets,
  housing: character.housing,
  relationships: character.relationships,
  father: character.father,
  mother: character.mother,
  wealth: character.familyWealth,
  religion: character.religion,
  language: character.language,
};

export type StatKey = keyof typeof initialStats;
export type SettingKey = keyof typeof initialSettings;

export const characteristics = [
  { icon: heartIcon, name: 'Здоровье', value: character.stats.health },
  { icon: brainIcon, name: 'Интеллект', value: character.stats.intelligence },
  { icon: fireIcon, name: 'Внешность', value: character.stats.appearance },
];

export const family = [
  { icon: '👩', name: 'Мама – Акико, 29 лет', description: 'Медсестра. Заботливая и терпеливая.' },
  { icon: '👨', name: 'Папа – Кэнта, 32 года', description: 'Автомеханик. Спокойный и требовательный.' },
  { icon: '👶', name: 'Брат – Хару, 5 лет', description: 'Ходит в садик. Любит рисовать' },
  { icon: '👶', name: 'Брат – Хару, 5 лет', description: 'Ходит в садик. Любит рисовать' },
];

export const familyDetails = [
  ['Жильё', 'Съёмная квартира'],
  ['Достаток', `${character.familyWealth}, стабильный доход`],
  ['Отношения в семье', 'Тёплые и крепкие'],
  ['Вера семьи', character.religion],
  ['Язык в семье', character.language],
];

export const country = {
  name: character.country,
  lifeExpectancy: '69 лет',
  childMortality: '5.3%',
  details: [
    ['⛩️', 'Религии страны', 'Синтоизм и буддизм'],
    ['💸', 'ВВП на душу населения', '$5,419'],
    ['💱', 'Валюта', 'Иена'],
  ],
};

export const birthPreview = {
  country: 'Канада',
  city: 'Оттава',
  birthChance: '1 из 1400',
};

export const account = {
  tokenBalance: 720,
  parameterChangeTotal: 400,
};

// Промежуточные страны нужны только для визуального перебора.
// Результат всегда берётся из character.
export const birthAnimation = {
  steps: [
    { country: 'Индия', countryCode: 'IN', duration: 90 },
    { country: 'Таджикистан', countryCode: 'TJ', duration: 100 },
    { country: 'Джибути', countryCode: 'DJ', duration: 110 },
    { country: 'Гондурас', countryCode: 'HN', duration: 120 },
    { country: 'Индонезия', countryCode: 'ID', duration: 140 },
    { country: 'Бразилия', countryCode: 'BR', duration: 160 },
    { country: 'Аргентина', countryCode: 'AR', duration: 180 },
    { country: 'Канада', countryCode: 'CA', duration: 210 },
    { country: 'Франция', countryCode: 'FR', duration: 250 },
    { country: 'Индия', countryCode: 'IN', duration: 300 },
    { country: 'Бразилия', countryCode: 'BR', duration: 380 },
    { country: 'Индонезия', countryCode: 'ID', duration: 480 },
  ],
  resultDuration: 1200,
  reducedMotionDuration: 700,
};

export const gameRules = [
  'Время идёт само по себе',
  'Выбирай действия. Решения влияют на всю жизнь.',
  'Следи за состоянием персонажа.',
];

export const lives: Life[] = [
  {
    id: 1,
    name: 'Луиза Браун',
    years: '1970 – 2046',
    country: 'Бразилия',
    description: '10 лет работала в Тайланде художником',
    image: louisaImage,
  },
  {
    id: 2,
    name: 'Женнева Джули',
    years: '1990 – 2096',
    country: 'Франция',
    description: 'Встретила старость в окружении семьи и 4 внуков',
    image: genevaImage,
  },
  {
    id: 3,
    name: 'Жаклин Джули',
    years: '1994 – 2096',
    country: 'Франция',
    description: 'Стала призёром всешкольной выставки',
    image: jacquelineImage,
  },
];
