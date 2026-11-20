import type { Decision } from './gameChoices';

export const adultDecisions: Decision[] = [
  {
    id: 'family-weekend', age: 10.5, title: 'Выходной с семьёй',
    text: 'Семья просит помочь с домашними делами, а друг зовёт гулять.',
    options: [
      { title: 'Помочь и встретиться позже', text: 'Удалось помочь дома и оставить время для друга.', changes: { relationships: 1 }, closeness: { mother: 3, father: 2 }, aura: 2 },
      { title: 'Сразу уйти гулять', text: 'Прогулка удалась, но дома огорчились из-за невыполненного обещания.', changes: { happiness: 2 }, closeness: { mother: -3, friend: 3 }, aura: -1 },
    ],
  },
  {
    id: 'broken-cup', age: 12.5, title: 'Разбитая чашка',
    text: 'Любимая чашка разбилась случайно. Никто этого не видел.',
    options: [
      { title: 'Признаться и помочь убрать', text: 'Честный разговор помог сохранить доверие.', changes: {}, closeness: { mother: 4, father: 2 }, aura: 4 },
      { title: 'Купить замену на свои деньги', text: 'Ты купил замену и рассказал о случившемся.', changes: {}, money: { expenses: 700 }, closeness: { mother: 3 }, aura: 2 },
      { title: 'Обвинить другого', text: 'Несправедливое обвинение испортило отношения с близкими.', changes: { relationships: -2 }, closeness: { brother: -6, mother: -2 }, aura: -6 },
    ],
  },
  {
    id: 'trip-budget', age: 14.5, title: 'Поездка с друзьями',
    text: 'Друзья планируют поездку. Участие стоит 3 000 ₽ из личных накоплений.',
    options: [
      { title: 'Поехать вместе', text: 'Поездка подарила общие воспоминания.', changes: { happiness: 3 }, money: { expenses: 3000 }, closeness: { friend: 5 }, aura: 0 },
      { title: 'Предложить бесплатную прогулку', text: 'Вы нашли способ провести время без лишних расходов.', changes: { happiness: 1 }, closeness: { friend: 2 }, aura: 1 },
    ],
  },
  {
    id: 'first-pay', age: 16.5, title: 'Как потратить первый заработок?',
    text: 'Часть заработка можно потратить на себя, помочь семье или отложить.', important: true,
    options: [
      { title: 'Помочь семье — 5 000 ₽', text: 'Часть заработка пошла на семейные расходы.', changes: { relationships: 2 }, money: { expenses: 5000 }, closeness: { mother: 5, father: 5 }, aura: 5 },
      { title: 'Подарить себе увлечение — 4 000 ₽', text: 'Новые материалы для хобби вдохновили на творчество.', changes: { happiness: 3, intelligence: 1 }, money: { expenses: 4000 }, aura: 0 },
      { title: 'Сохранить деньги', text: 'Заработанные деньги остались в накоплениях.', changes: { intelligence: 1 }, aura: 0 },
    ],
  },
  {
    id: 'education-path', age: 18, title: 'Продолжить учёбу?',
    text: 'Базовое образование закончено. Этот выбор определит доходы и расходы ближайших лет.', important: true,
    options: [
      { title: 'Начать работать сразу', text: 'Началась работа: доход выше, но на близких остаётся меньше времени.', career: 'work', changes: { intelligence: 1 }, closeness: { mother: -2, friend: -3 }, aura: 0 },
      { title: 'Поступить в вуз и подрабатывать', text: 'Учёба совмещается с подработкой. Доход скромнее, зато больше новых знаний.', career: 'university', changes: { intelligence: 4 }, closeness: { mother: 3 }, aura: 0 },
      { title: 'Получить профессию в колледже', text: 'Практическое обучение постепенно открывает дорогу к заработку.', career: 'college', changes: { intelligence: 3 }, closeness: { father: 3 }, aura: 0 },
      { title: 'Взять время на поиск пути', text: 'Появилось время разобраться в планах. Пока бюджет опирается на нерегулярные заработки.', career: 'gap', changes: { health: 2, happiness: 1 }, closeness: { mother: -2, father: -2 }, aura: 0 },
    ],
  },
  {
    id: 'family-visit', age: 19.5, title: 'Встретиться с близкими?',
    text: 'Близкие скучают и зовут провести выходные вместе.',
    options: [
      { title: 'Приехать с подарками — 2 000 ₽', text: 'Встреча получилась тёплой и душевной.', changes: { happiness: 2 }, money: { expenses: 2000 }, closeness: { mother: 5, father: 4, brother: 3 }, aura: 3 },
      { title: 'Созвониться вечером', text: 'Даже короткий разговор помог почувствовать близость.', changes: { happiness: 1 }, closeness: { mother: 2, father: 2 }, aura: 1 },
      { title: 'Отложить общение', text: 'Встреча снова не состоялась. Родные почувствовали отдаление.', changes: {}, closeness: { mother: -4, father: -3 }, aura: -1 },
    ],
  },
  {
    id: 'friend-loan', age: 20.5, title: 'Друг просит помощи',
    text: 'Друг оказался в сложной ситуации и просит 5 000 ₽. Возврат денег не гарантирован.', important: true,
    options: [
      { title: 'Помочь деньгами', text: 'Деньги переданы другу как помощь без обязательства вернуть.', changes: { relationships: 2 }, money: { expenses: 5000 }, closeness: { friend: 8 }, aura: 4 },
      { title: 'Помочь найти решение', text: 'Вы вместе составили план и нашли способ обойтись без займа.', changes: { intelligence: 1 }, closeness: { friend: 3 }, aura: 2 },
      { title: 'Резко отказать', text: 'Отказ прозвучал обидно и отдалил друга.', changes: {}, closeness: { friend: -7 }, aura: -2 },
    ],
  },
  {
    id: 'bonus', age: 21.5, title: 'Разовый дополнительный доход',
    text: 'За выполненное задание получено 15 000 ₽. Как ими распорядиться?',
    options: [
      { title: 'Пополнить накопления', text: 'Дополнительные 15 000 ₽ пополнили бюджет.', changes: {}, money: { income: 15000 }, aura: 0 },
      { title: 'Отметить с близкими — 3 000 ₽', text: 'Часть дополнительного дохода пошла на совместный ужин.', changes: { happiness: 2 }, money: { income: 15000, expenses: 3000 }, closeness: { mother: 2, father: 2, friend: 2 }, aura: 2 },
    ],
  },
];
