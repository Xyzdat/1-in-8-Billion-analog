import { careerBudgets, childhoodBudget } from '../mocks/lifeEconomy.ts';
import type { CareerPath } from '../mocks/lifeEconomy.ts';
import type { LifeEvent } from '../mocks/lifeEvents.ts';

export type MoneyEntry = { id: string; age: number; title: string; income: number; expenses: number };
export type FinanceState = {
  income: number;
  expenses: number;
  savings: number;
  debt: number;
  year: number;
  career: string;
  ledger: MoneyEntry[];
};

export function getFinances(age: number, events: LifeEvent[]): FinanceState {
  const ledger: MoneyEntry[] = [];
  const careerEvents = events.filter((event) => event.career);
  const careerAt = (at: number): CareerPath => careerEvents.filter((event) => event.age <= at).at(-1)?.career || 'gap';
  const round = (value: number) => Math.round(value * 100) / 100;

  for (let month = 1; month <= Math.floor(age * 12 + 1e-8); month++) {
    const fromAge = (month - 1) / 12;
    const budget = fromAge >= 18
      ? careerBudgets[careerAt(fromAge)]
      : childhoodBudget.filter((item) => item.from <= fromAge).at(-1)!;
    if (!budget.income && !budget.expenses) continue;
    ledger.push({
      id: `month-${month}`,
      age: month / 12,
      title: fromAge < 16 ? 'Карманные деньги и личные расходы' : fromAge < 18 ? 'Подработка и личные расходы' : careerBudgets[careerAt(fromAge)].title,
      income: round(budget.income / 12),
      expenses: round(budget.expenses / 12),
    });
  }
  for (const event of events) {
    if (!event.money) continue;
    ledger.push({ id: event.id, age: event.age, title: event.title, income: event.money.income || 0, expenses: event.money.expenses || 0 });
    if (event.yearlyCost) {
      for (let month = Math.floor(event.age * 12) + 1; month <= Math.floor(age * 12 + 1e-8); month++) {
        const portion = month / 12 - Math.max(event.age, (month - 1) / 12);
        ledger.push({ id: `maintenance-${event.id}-${month}`, age: month / 12, title: `Содержание: ${event.title}`, income: 0, expenses: round(event.yearlyCost * portion) });
      }
    }
  }
  ledger.sort((a, b) => a.age - b.age);
  const year = Math.max(0, Math.ceil(age) - 1);
  const currentYear = ledger.filter((entry) => entry.age > Math.max(0, age - 1) && entry.age <= age);
  const total = ledger.reduce((balance, entry) => balance + entry.income - entry.expenses, 0);
  return {
    income: round(currentYear.reduce((sum, entry) => sum + entry.income, 0)),
    expenses: round(currentYear.reduce((sum, entry) => sum + entry.expenses, 0)),
    savings: round(Math.max(0, total)),
    debt: round(Math.max(0, -total)),
    year,
    career: age >= 18 ? careerBudgets[careerAt(age)].title : 'Карманные деньги',
    ledger,
  };
}
