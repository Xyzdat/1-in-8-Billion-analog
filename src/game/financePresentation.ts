import type { SpendingCategory, SpendingCurrency, SpendingEffects } from '../api/financeTypes.ts';

const amountFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function formatServerMoney(value: number | null, currency: SpendingCurrency) {
  if (value === null) return 'Нет данных';
  return `${amountFormatter.format(value)} ${currency === 'RUB' ? '₽' : '$ ППС'}`;
}

export function formatSpendingEffects(effects: SpendingEffects | null) {
  const labels = {
    health: 'Здоровье', happiness: 'Счастье', intelligence: 'Интеллект',
    relationships: 'Отношения', appearance: 'Внешность',
  };
  return (Object.keys(labels) as (keyof SpendingEffects)[]).flatMap((key) => {
    const change = effects?.[key];
    return change == null || change === 0 ? [] : [`${labels[key]} ${change > 0 ? '+' : ''}${change}`];
  }).join(' · ');
}

export function groupSpendingCategories(categories: SpendingCategory[]) {
  const groups = new Map<string, { id: string; title: string; categories: SpendingCategory[] }>();
  for (const category of categories) {
    const group = groups.get(category.groupId) ?? { id: category.groupId, title: category.groupTitle, categories: [] };
    group.categories.push(category);
    groups.set(category.groupId, group);
  }
  return [...groups.values()];
}
