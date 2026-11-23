import type { SettingKey } from '../types/character';
import catImage from '../assets/modal-cat.png';
import dogImage from '../assets/modal-dog.png';
import pawsImage from '../assets/modal-paws.png';

export type ParameterOption = {
  label: string;
  icon?: string;
  group?: string;
  image?: string;
};

type ParameterField = {
  title: string;
  price: number;
  options: ParameterOption[];
  search?: string;
  hint?: string;
};

const options = (...labels: string[]): ParameterOption[] => labels.map((label) => ({ label }));

export const parameterFields: Record<SettingKey, ParameterField> = {
  name: {
    title: 'Выбери имя',
    price: 100,
    options: options('Хана Сато', 'Рин Танака', 'Мэй Ито', 'Аой Судзуки'),
  },
  gender: {
    title: 'Выбери пол',
    price: 100,
    options: [{ label: 'Женщина', icon: '👩' }, { label: 'Мужчина', icon: '👨' }],
  },
  country: {
    title: 'Выбери страну',
    price: 100,
    search: 'Поиск страны',
    hint: 'При смене страны регион и город сбросятся.',
    options: [
      { label: 'Индия', icon: '🇮🇳', group: 'Азия' },
      { label: 'Канада', icon: '🇨🇦', group: 'Америка' },
      { label: 'Китай', icon: '🇨🇳', group: 'Азия' },
      { label: 'Япония', icon: '🇯🇵', group: 'Азия' },
      { label: 'Южная Корея', icon: '🇰🇷', group: 'Азия' },
      { label: 'Турция', icon: '🇹🇷', group: 'Азия' },
      { label: 'Франция', icon: '🇫🇷', group: 'Европа' },
    ],
  },
  region: {
    title: 'Выбери регион',
    price: 150,
    search: 'Поиск региона',
    options: options('Токио', 'Осака', 'Киото', 'Хёго', 'Хоккайдо', 'Аити', 'Фукуока'),
  },
  city: {
    title: 'Выбери город',
    price: 150,
    search: 'Поиск города',
    options: options('Кобе', 'Химэдзи', 'Нисиномия', 'Амагасаки', 'Акаси', 'Такарадзука'),
  },
  family: {
    title: 'Состав семьи',
    price: 200,
    options: [{ label: 'Полная семья', icon: '👪' }, { label: 'Только мама', icon: '👩' }, { label: 'Только папа', icon: '👨' }, { label: 'Детский дом', icon: '🏠' }],
  },
  siblings: {
    title: 'Братья и сёстры',
    price: 100,
    options: options('Нет', 'Один брат', 'Одна сестра', 'Брат и сестра', 'Два брата', 'Две сестры'),
  },
  pets: {
    title: 'Домашние животные',
    price: 200,
    options: [{ label: 'Нет', icon: '🙅' }, { label: 'Кошка', image: catImage }, { label: 'Собака', image: dogImage }, { label: 'Несколько домашних животных', image: pawsImage }],
  },
  housing: {
    title: 'Жильё',
    price: 150,
    search: 'Поиск жилья',
    options: options('Небольшая студия', 'Просторная квартира', 'Коммунальная квартира', 'Съёмная квартира', 'Собственный дом', 'Комната в общежитии', 'Дом бабушки и дедушки', 'Большой особняк'),
  },
  relationships: {
    title: 'Отношения в семье',
    price: 150,
    search: 'Поиск отношений',
    options: options('Тёплые и крепкие', 'Сдержанные и уважительные', 'Отстранённые, каждый сам по себе', 'Переменчивые, от близости до ссор', 'Контролирующие, с жёсткими правилами', 'Враждебные, без поддержки'),
  },
  father: {
    title: 'Профессия отца',
    price: 200,
    search: 'Поиск профессии',
    options: [{ label: 'Случайно', icon: '🎲' }, { label: 'Механик', icon: '🔧' }, { label: 'Инженер', icon: '📐' }, { label: 'Врач', icon: '🩺' }, { label: 'Учитель', icon: '🍎' }, { label: 'Рыбак', icon: '🎣' }, { label: 'Водитель', icon: '🚚' }, { label: 'Бизнесмен', icon: '💼' }],
  },
  mother: {
    title: 'Профессия матери',
    price: 100,
    search: 'Поиск профессии',
    options: options('Медсестра', 'Врач', 'Учитель', 'Инженер', 'Продавец', 'Предприниматель'),
  },
  wealth: {
    title: 'Достаток семьи',
    price: 150,
    options: options('Очень низкий', 'Скромный', 'Средний', 'Обеспеченный', 'Богатый'),
  },
  religion: {
    title: 'Вера семьи',
    price: 100,
    search: 'Поиск религии',
    options: options('Буддизм', 'Синтоизм', 'Христианство', 'Ислам', 'Индуизм', 'Иудаизм', 'Атеизм'),
  },
  language: {
    title: 'Язык в семье',
    price: 200,
    search: 'Поиск языка',
    options: [{ label: 'Английский', icon: '🇬🇧' }, { label: 'Русский', icon: '🇷🇺' }, { label: 'Китайский', icon: '🇨🇳' }, { label: 'Японский', icon: '🇯🇵' }, { label: 'Хинди', icon: '🇮🇳' }, { label: 'Испанский', icon: '🇪🇸' }, { label: 'Арабский', icon: '🇸🇦' }],
  },
};

export const countryCodes: Record<string, string> = {
  Япония: 'JP',
  Индия: 'IN',
  Канада: 'CA',
  Китай: 'CN',
  'Южная Корея': 'KR',
  Турция: 'TR',
  Франция: 'FR',
};

// Небольшой каталог для фронтенд-прототипа; регионы и города связаны.
export const locations: Record<string, Record<string, string[]>> = {
  Япония: {
    Хёго: ['Кобе', 'Химэдзи', 'Нисиномия', 'Амагасаки', 'Акаси', 'Такарадзука'],
    Токио: ['Токио'],
    Осака: ['Осака', 'Сакаи'],
    Киото: ['Киото'],
    Хоккайдо: ['Саппоро'],
    Аити: ['Нагоя'],
    Фукуока: ['Фукуока'],
  },
  Канада: { Онтарио: ['Оттава', 'Торонто'], Квебек: ['Монреаль', 'Квебек'] },
  Индия: { Махараштра: ['Мумбаи', 'Пуна'], Дели: ['Нью-Дели'] },
  Китай: { Пекин: ['Пекин'], Гуандун: ['Гуанчжоу', 'Шэньчжэнь'] },
  'Южная Корея': { Сеул: ['Сеул'], Пусан: ['Пусан'] },
  Турция: { Стамбул: ['Стамбул'], Анкара: ['Анкара'] },
  Франция: { 'Иль-де-Франс': ['Париж'], Нормандия: ['Руан', 'Кан'] },
};
