export type CareerPath = 'work' | 'university' | 'college' | 'gap';
export type PersonId = 'mother' | 'father' | 'brother' | 'sibling-1' | 'friend';

export const initialCloseness: Record<PersonId, number> = {
  mother: 94,
  father: 86,
  brother: 78,
  'sibling-1': 74,
  friend: 80,
};

// Учебные суммы в рублях: не реальные экономические прогнозы.
// Годовые ставки начисляются равными частями каждый игровой месяц.
export const childhoodBudget = [
  { from: 0, income: 0, expenses: 0 },
  { from: 6, income: 2400, expenses: 1200 },
  { from: 10, income: 7200, expenses: 4800 },
  { from: 14, income: 24000, expenses: 18000 },
  { from: 16, income: 60000, expenses: 42000 },
];

export const careerBudgets: Record<CareerPath, { title: string; income: number; expenses: number }> = {
  work: { title: 'Работа', income: 365400, expenses: 252108 },
  university: { title: 'Вуз и подработка', income: 180000, expenses: 156000 },
  college: { title: 'Профессиональное обучение', income: 240000, expenses: 180000 },
  gap: { title: 'Поиск своего пути', income: 96000, expenses: 84000 },
};

export const yearlyFamilyChanges: Record<number, Partial<Record<PersonId, number>>> = {
  1: { mother: 1, father: 1 },
  3: { mother: -2, father: 1, brother: 2 },
  5: { mother: 2, brother: -3 },
  7: { friend: 3, brother: 2 },
  10: { mother: -3, father: -2, friend: 2 },
  12: { mother: -4, father: -3, brother: -2 },
  14: { mother: -3, father: -4, friend: 3 },
  16: { mother: 2, father: 2 },
  18: { mother: -2, father: -2, friend: -3 },
  20: { mother: 3, father: 2 },
  22: { mother: 2, brother: 2, friend: 1 },
};

export const personLabels: Record<PersonId, string> = {
  mother: 'Мама', father: 'Папа', brother: 'Брат/сестра', 'sibling-1': 'Брат/сестра', friend: 'Друг',
};
