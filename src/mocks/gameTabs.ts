import { initialCloseness } from './lifeEconomy';

export type ClosePerson = {
  id: string;
  name: string;
  role: string;
  ageAtBirth: number;
  occupation: string;
  icon: string;
  closeness: number;
};

export const closePeople: ClosePerson[] = [
  {
    id: 'mother',
    name: 'Акико Ватанабе',
    role: 'Мама',
    ageAtBirth: 29,
    occupation: 'Медсестра',
    icon: '👩',
    closeness: initialCloseness.mother,
  },
  {
    id: 'father',
    name: 'Кэнта Ватанабе',
    role: 'Папа',
    ageAtBirth: 32,
    occupation: 'Механик',
    icon: '👨',
    closeness: initialCloseness.father,
  },
  {
    id: 'brother',
    name: 'Хару Ватанабе',
    role: 'Брат',
    ageAtBirth: 5,
    occupation: 'Ходит в детский сад',
    icon: '👦',
    closeness: initialCloseness.brother,
  },
];

export const childhoodFriend: ClosePerson = {
  id: 'friend',
  name: 'Рин Танака',
  role: 'Лучший друг',
  ageAtBirth: 0,
  occupation: 'Учится в школе',
  icon: '🧒',
  closeness: initialCloseness.friend,
};

export const siblingNames = ['Хару Ватанабе', 'Аой Ватанабе'];

export const relationshipExpenses = [
  { id: 'meet', icon: '👥', title: 'Новые знакомства', effect: 'Отношения +2 · Счастье +1', price: 3942 },
  { id: 'dinner', icon: '🍴', title: 'Ужин и подарки', effect: 'Отношения +4 · Счастье +2', price: 5912 },
  { id: 'treat', icon: '🎁', title: 'Угостить друзей', effect: 'Отношения +5', price: 4927 },
];

export const spendingCategories = [
  {
    id: 'property',
    title: 'Имущество',
    description: 'Улучшай своё имущество и покупай новое',
    actions: [{ icon: '💸', title: 'Купить имущество' }],
  },
  {
    id: 'health',
    title: 'Здоровье',
    description: 'Следи за своим здоровьем',
    actions: [{ icon: '❤️‍🩹', title: 'Процедуры' }],
  },
  {
    id: 'hobby',
    title: 'Хобби',
    description: 'Развивай свои увлечения',
    actions: [{ icon: '🎨', title: 'Новое увлечение' }],
  },
  {
    id: 'appearance',
    title: 'Внешность',
    description: 'Улучшай показатели своей внешности',
    actions: [{ icon: '🎀', title: 'Записаться на услуги' }],
  },
  {
    id: 'pets',
    title: 'Домашние животные',
    description: '',
    actions: [{ icon: '🐾', title: 'Завести питомца' }],
  },
  {
    id: 'education',
    title: 'Курсы и обучение',
    description: '',
    actions: [{ icon: '🔒', title: 'Профессиональное обучение', note: 'От 15 800 ₽ · с 18 лет' }],
  },
  {
    id: 'moving',
    title: 'Переезд',
    description: '',
    actions: [
      { icon: '🏠', title: 'Переехать в другой город' },
      { icon: '🌍', title: 'Переехать в другую страну' },
    ],
  },
];
