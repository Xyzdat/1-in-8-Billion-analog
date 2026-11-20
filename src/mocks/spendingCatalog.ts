import type { GameStats } from './lifeEvents';

export type ShopSection = 'property' | 'health' | 'hobby' | 'appearance' | 'pets' | 'education' | 'city' | 'country' | 'relationships';
export type ShopItem = {
  id: string;
  title: string;
  icon: string;
  price: number;
  yearlyCost?: number;
  description: string;
  changes?: Partial<GameStats>;
  appearance?: number;
  durationMonths?: number;
  location?: { country: string; city: string };
};

export const shopSections: Record<ShopSection, { title: string; heading: string; description: string; confirm: string; minAge: number; items: ShopItem[] }> = {
  property: {
    title: 'Купить имущество', heading: 'Что купить?', description: 'Выбери покупку для своей жизни. Содержание может требовать расходов.', confirm: 'Купить', minAge: 6,
    items: [
      { id: 'bicycle', title: 'Велосипед', icon: '🚲', price: 6000, yearlyCost: 600, description: 'Для прогулок и поездок.', changes: { health: 2 } },
      { id: 'laptop', title: 'Ноутбук', icon: '💻', price: 24000, yearlyCost: 2400, description: 'Для учёбы и работы.', changes: { intelligence: 2 } },
      { id: 'motorcycle', title: 'Мотоцикл', icon: '🏍️', price: 33942, yearlyCost: 6400, description: 'Личный транспорт. Доступен с 18 лет.' },
      { id: 'house', title: 'Загородный дом', icon: '🏡', price: 199854, yearlyCost: 23600, description: 'Собственное жильё за городом.', changes: { happiness: 3 } },
    ],
  },
  health: {
    title: 'Процедуры', heading: 'Позаботься о себе', description: 'Выбери процедуру, чтобы улучшить своё здоровье', confirm: 'Записаться', minAge: 6,
    items: [
      { id: 'checkup', title: 'Осмотр врача', icon: '🩺', price: 1200, description: 'Диагностика. Показатель здоровья не меняется.' },
      { id: 'massage', title: 'Тайский массаж', icon: '💆', price: 2400, description: 'Здоровье +2', changes: { health: 2 } },
      { id: 'dentist', title: 'Приём стоматолога', icon: '🦷', price: 3000, description: 'Здоровье +1', changes: { health: 1 } },
    ],
  },
  appearance: {
    title: 'Услуги для внешности', heading: 'Время для себя', description: 'Выбери услугу, чтобы обновить свой образ', confirm: 'Записаться', minAge: 6,
    items: [
      { id: 'haircut', title: 'Стрижка и укладка', icon: '✂️', price: 1500, description: 'Внешность +2', appearance: 2 },
      { id: 'skin', title: 'Уход за кожей', icon: '✨', price: 2000, description: 'Внешность +3', appearance: 3 },
      { id: 'manicure', title: 'Маникюр', icon: '💅', price: 1200, description: 'Внешность +1', appearance: 1 },
      { id: 'wardrobe', title: 'Подбор гардероба', icon: '🛍️', price: 4000, description: 'Внешность +4', appearance: 4 },
    ],
  },
  pets: {
    title: 'Завести питомца', heading: 'Новый друг', description: 'Выбери нового друга. Уход оплачивается каждый год.', confirm: 'Купить', minAge: 6,
    items: [
      { id: 'dog', title: 'Собака', icon: '🐶', price: 3000, yearlyCost: 7200, description: 'Верный друг.', changes: { happiness: 3 } },
      { id: 'cat', title: 'Кошка', icon: '🐈', price: 1500, yearlyCost: 3600, description: 'Домашний друг.', changes: { happiness: 3 } },
      { id: 'parrot', title: 'Попугай', icon: '🦜', price: 1200, yearlyCost: 2400, description: 'Любопытный собеседник.', changes: { happiness: 2 } },
      { id: 'hamster', title: 'Хомяк', icon: '🐹', price: 600, yearlyCost: 1200, description: 'Маленький домашний друг.', changes: { happiness: 2 } },
    ],
  },
  education: {
    title: 'Профессиональное обучение', heading: 'Новая профессия', description: 'Освой профессию и открой новые варианты работы.', confirm: 'Начать обучение', minAge: 18,
    items: [
      { id: 'repair', title: 'Ремонт техники', icon: '🔧', price: 15800, durationMonths: 6, description: 'Научишься обслуживать и ремонтировать бытовую технику. После курса сможешь искать работу по специальности.' },
      { id: 'computers', title: 'Офис и компьютеры', icon: '💻', price: 15800, durationMonths: 4, description: 'Освоишь офисные программы и работу с компьютером.' },
      { id: 'cooking', title: 'Кулинария', icon: '🍽️', price: 15800, durationMonths: 6, description: 'Научишься готовить и организовывать работу на кухне.' },
      { id: 'care', title: 'Уход за людьми', icon: '📘', price: 15800, durationMonths: 3, description: 'Получишь базовые навыки ухода и помощи людям.' },
    ],
  },
  country: {
    title: 'Переехать в другую страну', heading: 'Новая страна', description: 'Выбери страну для новой главы своей жизни.', confirm: 'Переехать', minAge: 18,
    items: [
      { id: 'georgia', title: 'Грузия', icon: '🇬🇪', price: 3942, description: 'Город — Тбилиси', location: { country: 'Грузия', city: 'Тбилиси' } },
      { id: 'armenia', title: 'Армения', icon: '🇦🇲', price: 4927, description: 'Город — Ереван', location: { country: 'Армения', city: 'Ереван' } },
      { id: 'serbia', title: 'Сербия', icon: '🇷🇸', price: 7883, description: 'Город — Белград', location: { country: 'Сербия', city: 'Белград' } },
      { id: 'canada', title: 'Канада', icon: '🇨🇦', price: 19700, description: 'Город — Оттава', location: { country: 'Канада', city: 'Оттава' } },
    ],
  },
  city: {
    title: 'Переехать в другой город', heading: 'Новый город', description: 'Выбери город для новой главы своей жизни.', confirm: 'Переехать', minAge: 18,
    items: [],
  },
  hobby: {
    title: 'Новое увлечение', heading: 'Время для увлечений', description: 'Выбери занятие для свободного времени.', confirm: 'Начать', minAge: 6,
    items: [
      { id: 'drawing', title: 'Рисование', icon: '🎨', price: 1200, description: 'Счастье +2 · Интеллект +1', changes: { happiness: 2, intelligence: 1 } },
      { id: 'music', title: 'Музыка', icon: '🎵', price: 2400, description: 'Счастье +3', changes: { happiness: 3 } },
    ],
  },
  relationships: {
    title: 'Отношения', heading: 'Время вместе', description: 'Проведи время с близкими.', confirm: 'Оплатить', minAge: 6,
    items: [
      { id: 'meet', title: 'Новые знакомства', icon: '👥', price: 3942, description: 'Отношения +2 · Счастье +1', changes: { relationships: 2, happiness: 1 } },
      { id: 'dinner', title: 'Ужин и подарки', icon: '🍴', price: 5912, description: 'Отношения +4 · Счастье +2', changes: { relationships: 4, happiness: 2 } },
      { id: 'treat', title: 'Угостить друзей', icon: '🎁', price: 4927, description: 'Отношения +5', changes: { relationships: 5 } },
    ],
  },
};

export const cityCatalog: Record<string, ShopItem[]> = {
  Грузия: [
    { id: 'tbilisi', title: 'Тбилиси', icon: '🇬🇪', price: 3942, description: 'Столица. Население 1 172 010 чел.' },
    { id: 'batumi', title: 'Батуми', icon: '🇬🇪', price: 7942, description: 'Население 183 200 чел.' },
    { id: 'rustavi', title: 'Рустави', icon: '🇬🇪', price: 3942, description: 'Население 132 333 чел.' },
    { id: 'gori', title: 'Гори', icon: '🇬🇪', price: 942, description: 'Население 48 143 чел.' },
  ],
  Япония: [
    { id: 'kobe', title: 'Кобе', icon: '🇯🇵', price: 3942, description: 'Город в префектуре Хёго.' },
    { id: 'tokyo', title: 'Токио', icon: '🇯🇵', price: 7942, description: 'Столица Японии.' },
    { id: 'osaka', title: 'Осака', icon: '🇯🇵', price: 3942, description: 'Крупный город региона Кансай.' },
  ],
  Армения: [{ id: 'yerevan', title: 'Ереван', icon: '🇦🇲', price: 3942, description: 'Столица Армении.' }, { id: 'gyumri', title: 'Гюмри', icon: '🇦🇲', price: 942, description: 'Город на севере Армении.' }],
  Сербия: [{ id: 'belgrade', title: 'Белград', icon: '🇷🇸', price: 3942, description: 'Столица Сербии.' }, { id: 'novi-sad', title: 'Нови-Сад', icon: '🇷🇸', price: 942, description: 'Город на Дунае.' }],
  Канада: [{ id: 'ottawa', title: 'Оттава', icon: '🇨🇦', price: 3942, description: 'Столица Канады.' }, { id: 'toronto', title: 'Торонто', icon: '🇨🇦', price: 7942, description: 'Город в провинции Онтарио.' }],
  Индия: [{ id: 'delhi', title: 'Нью-Дели', icon: '🇮🇳', price: 3942, description: 'Столица Индии.' }, { id: 'mumbai', title: 'Мумбаи', icon: '🇮🇳', price: 7942, description: 'Крупный город на западе Индии.' }],
  Китай: [{ id: 'beijing', title: 'Пекин', icon: '🇨🇳', price: 3942, description: 'Столица Китая.' }, { id: 'shanghai', title: 'Шанхай', icon: '🇨🇳', price: 7942, description: 'Город на востоке Китая.' }],
  'Южная Корея': [{ id: 'seoul', title: 'Сеул', icon: '🇰🇷', price: 3942, description: 'Столица Южной Кореи.' }, { id: 'busan', title: 'Пусан', icon: '🇰🇷', price: 7942, description: 'Город у моря.' }],
  Турция: [{ id: 'ankara', title: 'Анкара', icon: '🇹🇷', price: 3942, description: 'Столица Турции.' }, { id: 'istanbul', title: 'Стамбул', icon: '🇹🇷', price: 7942, description: 'Город на двух континентах.' }],
  Франция: [{ id: 'paris', title: 'Париж', icon: '🇫🇷', price: 7942, description: 'Столица Франции.' }, { id: 'lyon', title: 'Лион', icon: '🇫🇷', price: 3942, description: 'Город на юго-востоке Франции.' }],
};

export const petNames = ['Василёк', 'Мико', 'Луна', 'Снежок', 'Персик'];

export function getShopItems(section: ShopSection, country: string): ShopItem[] {
  if (section !== 'city') return shopSections[section].items;
  return (cityCatalog[country] || []).map((item) => ({ ...item, location: { country, city: item.title } }));
}
