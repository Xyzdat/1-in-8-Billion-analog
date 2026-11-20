import type { CareerPath, PersonId } from './lifeEconomy';

export type GameStats = { health: number; happiness: number; intelligence: number; relationships: number };
export type LifeEvent = {
  id: string;
  age: number;
  title: string;
  text: string;
  changes: Partial<GameStats>;
  aura?: number;
  closeness?: Partial<Record<PersonId, number>>;
  money?: { income?: number; expenses?: number };
  career?: CareerPath;
  yearlyCost?: number;
  appearance?: number;
};

export const lifeEvents: LifeEvent[] = [
  { id: 'birth', age: 0, title: 'Рождение', text: 'Начинается новая история.', changes: {} },
  { id: 'smile', age: 0.25, title: 'Первая улыбка', text: 'В ответ на знакомый голос появляется первая улыбка. Близкие улыбаются в ответ.', changes: { happiness: 1, relationships: 1 } },
  { id: 'toy', age: 0.5, title: 'Любимая игрушка', text: 'Яркая игрушка над кроваткой привлекает внимание. Так интересно следить за её движением!', changes: { intelligence: 1 } },
  { id: 'steps', age: 1, title: 'Первые шаги', text: 'Первые самостоятельные шаги! Близкие поддерживают и радуются маленькой победе.', changes: { health: 2, happiness: 2 } },
  { id: 'words', age: 2, title: 'Первые слова', text: 'Знакомые предметы обретают названия. Каждый день приносит новые слова и вопросы.', changes: { intelligence: 3, relationships: 2 } },
  { id: 'kindergarten', age: 3, title: 'Детский сад', text: 'Начинается детский сад: новые друзья, общие игры и первые уроки самостоятельности.', changes: { intelligence: 2, relationships: 3, happiness: 1 } },
  { id: 'hobby', age: 4, title: 'Первые увлечения', text: 'Рисование становится любимым занятием. Цветные карандаши превращают обычный лист в целый мир.', changes: { intelligence: 2, happiness: 3 } },
  { id: 'school', age: 5, title: 'Подготовка к школе', text: 'Пора готовиться к школе. Знакомые буквы и числа складываются в первые маленькие открытия.', changes: { intelligence: 4, relationships: 1 } },
  { id: 'class', age: 6, title: 'Первый класс', text: 'Новый класс, первая тетрадь и знакомство с учителем. Постепенно школьная жизнь становится привычной.', changes: { intelligence: 3, relationships: 2 } },
  { id: 'friendship', age: 7, title: 'Настоящая дружба', text: 'Появляется близкий друг. Вместе легче справляться с трудными заданиями и придумывать игры.', changes: { relationships: 3, happiness: 2 }, aura: 2 },
  { id: 'project', age: 8, title: 'Общее дело', text: 'Класс готовит выставку рисунков. Получается выслушать чужие идеи и довести свою работу до конца.', changes: { intelligence: 2, relationships: 2 }, aura: 3 },
  { id: 'growing', age: 9, title: 'Маленькая самостоятельность', text: 'Уже получается собирать портфель, планировать домашние задания и помогать близким без напоминаний.', changes: { intelligence: 3, happiness: 2 }, aura: 2 },
  { id: 'ten', age: 10, title: 'Свой небольшой бюджет', text: 'Карманные деньги помогают планировать покупки. Не всё получается сразу, но теперь понятнее, зачем откладывать.', changes: { intelligence: 1 } },
  { id: 'eleven', age: 11, title: 'Школьная ярмарка', text: 'На ярмарке удалось продать несколько своих поделок. Часть денег ушла на материалы.', changes: { happiness: 2 }, money: { income: 1800, expenses: 600 }, closeness: { friend: 2 } },
  { id: 'twelve', age: 12, title: 'Больше личного пространства', text: 'Семье непросто привыкнуть к твоей самостоятельности. Разговоры иногда заканчиваются спорами.', changes: { happiness: -2 } },
  { id: 'thirteen', age: 13, title: 'Поездка с классом', text: 'Класс отправился на экскурсию. Удалось узнать много нового и провести время с друзьями.', changes: { intelligence: 2, happiness: 2 }, money: { expenses: 1200 }, closeness: { friend: 3 } },
  { id: 'fourteen', age: 14, title: 'Подростковые перемены', text: 'Дружба становится важнее, а взгляды на мир всё чаще отличаются от взглядов родителей.', changes: { relationships: -1 } },
  { id: 'fifteen', age: 15, title: 'Общий школьный проект', text: 'Работа в команде учит договариваться и отвечать за свою часть задания.', changes: { intelligence: 2 }, closeness: { friend: 2 } },
  { id: 'sixteen', age: 16, title: 'Первая летняя подработка', text: 'Короткая подработка принесла первый заработок. Дорога и обеды тоже оказались статьёй расходов.', changes: { intelligence: 1, health: -1 }, money: { income: 12000, expenses: 3000 }, closeness: { father: 2 } },
  { id: 'seventeen', age: 17, title: 'Год подготовки', text: 'Занятия и подготовка к выпускным испытаниям требуют сил. Важно оставлять время на отдых.', changes: { intelligence: 3, happiness: -2 }, money: { expenses: 6000 } },
  { id: 'eighteen', age: 18, title: 'Совершеннолетие', text: 'Теперь предстоит выбрать дальнейший путь. Бюджет и отношения с семьёй всё больше зависят от твоих решений.', changes: { intelligence: 1 } },
  { id: 'nineteen', age: 19, title: 'Привычка планировать', text: 'Постепенно появляется привычка записывать доходы и расходы и заранее обсуждать планы с близкими.', changes: { intelligence: 2 }, closeness: { mother: 2 } },
  { id: 'twenty', age: 20, title: 'Новый ритм', text: 'Учёба, работа и личные планы требуют распределять время. Старые друзья видятся реже, но ещё остаются рядом.', changes: { intelligence: 1 } },
  { id: 'twenty-one', age: 21, title: 'Неожиданный ремонт', text: 'Сломалась нужная техника. Пришлось оплатить ремонт и пересмотреть планы на месяц.', changes: { happiness: -1 }, money: { expenses: 8500 }, closeness: { father: 1 } },
  { id: 'twenty-two', age: 22, title: 'Первые взрослые итоги', text: 'За плечами первые самостоятельные решения, заработки и ошибки. История до 22 лет завершена — можно оглянуться на пройденный путь.', changes: { happiness: 2 } },
];

export const gameDefaults = { happiness: 80, relationships: 90, aura: 0 };
export const statLabels: Record<keyof GameStats, string> = {
  health: 'Здоровье', happiness: 'Счастье', intelligence: 'Интеллект', relationships: 'Отношения',
};
