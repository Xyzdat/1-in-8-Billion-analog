import type { GameStats, LifeEvent } from './lifeEvents';
import { adultDecisions } from './adultDecisions.ts';

export type FocusId = 'balanced' | 'learning' | 'friends' | 'health' | 'creativity' | 'home' | 'rest';
export const yearlyFocus: { id: FocusId; title: string; icon: string; description: string; changes: Partial<GameStats> }[] = [
  { id: 'balanced', title: 'Баланс', icon: '🌿', description: 'Немного времени для игр, отдыха и общения.', changes: { happiness: 1, health: 1 } },
  { id: 'learning', title: 'Учёба', icon: '📚', description: 'Книги, вопросы и новые открытия.', changes: { happiness: -1, intelligence: 3 } },
  { id: 'friends', title: 'Друзья и общение', icon: '🤝', description: 'Больше времени с друзьями и близкими.', changes: { relationships: 3, happiness: 1 } },
  { id: 'health', title: 'Спорт и движение', icon: '🏃', description: 'Прогулки, движение и хороший отдых.', changes: { health: 3, happiness: 1 } },
  { id: 'creativity', title: 'Творчество и хобби', icon: '🎨', description: 'Рисование, музыка и новые идеи.', changes: { happiness: 2, relationships: -1 } },
  { id: 'home', title: 'Помощь по дому', icon: '🏡', description: 'Общие дела и поддержка близких.', changes: { relationships: 2, happiness: -1 } },
  { id: 'rest', title: 'Отдых', icon: '😴', description: 'Время восстановить силы.', changes: { health: 2, intelligence: -1 } },
];

export type Decision = {
  id: string;
  age: number;
  title: string;
  text: string;
  important?: boolean;
  options: ({ title: string; text: string; changes: Partial<GameStats>; aura: number } & Pick<LifeEvent, 'closeness' | 'money' | 'career'>)[];
};

export const decisions: Decision[] = [
  ...adultDecisions,
  { id: 'toy-choice', age: 3.5, title: 'Одна игрушка на двоих', text: 'Другой ребёнок тоже хочет поиграть с твоей любимой игрушкой. Как поступить?', options: [
    { title: 'Предложить играть вместе', text: 'Вы придумали общую игру и подружились.', changes: { relationships: 2, happiness: 1 }, aura: 3 },
    { title: 'Попросить подождать', text: 'Удалось договориться играть по очереди.', changes: { relationships: 1 }, aura: 1 },
    { title: 'Забрать игрушку', text: 'Игрушка осталась у тебя, но другой ребёнок расстроился.', changes: { relationships: -2 }, aura: -3 },
  ] },
  { id: 'bullying', age: 6.5, title: 'Защитить одноклассника', text: 'На перемене ребята дразнят нового ученика. Он остаётся один. Что ты сделаешь?', important: true, options: [
    { title: 'Позвать учителя и поддержать', text: 'Взрослый помог остановить насмешки. Новый ученик почувствовал поддержку.', changes: { relationships: 3, happiness: 1 }, aura: 8 },
    { title: 'Подойти после перемены', text: 'Разговор после урока помог новому знакомому почувствовать себя лучше.', changes: { relationships: 2 }, aura: 4 },
    { title: 'Пройти мимо', text: 'Ты не вмешался в происходящее. Осталось чувство, что можно было помочь.', changes: { happiness: -2 }, aura: -4 },
  ] },
  { id: 'lost-pencil', age: 7.5, title: 'Находка в классе', text: 'Под партой лежит красивый пенал. Хозяина рядом нет.', options: [
    { title: 'Отнести учителю', text: 'Пенал вернулся к владельцу, который очень обрадовался.', changes: { relationships: 1 }, aura: 4 },
    { title: 'Оставить на видном месте', text: 'Пенал остался на столе: теперь его легче найти.', changes: {}, aura: 1 },
    { title: 'Оставить себе', text: 'Чужой пенал оказался в твоём портфеле.', changes: { relationships: -1 }, aura: -5 },
  ] },
  { id: 'promise', age: 8.5, title: 'Сдержать обещание', text: 'Ты обещал помочь с общим проектом, но друзья зовут гулять.', important: true, options: [
    { title: 'Сначала закончить проект', text: 'Работа завершена вовремя. Команда знает, что на тебя можно положиться.', changes: { intelligence: 2, relationships: 2 }, aura: 6 },
    { title: 'Договориться о новом времени', text: 'Вы обсудили сроки и распределили работу заново.', changes: { relationships: 1 }, aura: 2 },
    { title: 'Уйти, никого не предупредив', text: 'Остальным пришлось заканчивать проект без тебя.', changes: { relationships: -3, happiness: 1 }, aura: -6 },
  ] },
  { id: 'after-school', age: 9, title: 'Чем заняться после школы?', text: 'На ум приходят несколько занятий, которые хотелось бы попробовать в свободное время.', options: [
    { title: 'Рисование и каллиграфия', text: 'После школы начались занятия рисованием и каллиграфией.', changes: { happiness: 2, intelligence: 2 }, aura: 0 },
    { title: 'Плавание в бассейне', text: 'Плавание помогает стать сильнее, но времени на общение стало меньше.', changes: { health: 3, relationships: -1 }, aura: 0 },
    { title: 'Мастерская с папой', text: 'В мастерской получилось узнать много нового и провести время вместе.', changes: { intelligence: 2, relationships: 2 }, aura: 0 },
    { title: 'Остаться при нынешних увлечениях', text: 'Любимые занятия остались прежними.', changes: {}, aura: 0 },
  ] },
];
