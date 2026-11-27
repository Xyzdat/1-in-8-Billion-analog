import type { BudgetPage } from '../api/budgetTypes.ts';
import type { Session } from '../api/sessionTypes.ts';
import type { Finances } from '../api/financeTypes.ts';

export function budgetActionBlockReason(session: Session) {
  if (session.state.status === 'COMPLETE') return 'Жизнь завершена. Доступен только просмотр.';
  if (session.provider !== 'local' || !session.simulation) return 'Управление бюджетом недоступно для этого сохранения.';
  if (session.state.age < 18) return 'Финансовые действия доступны с 18 лет.';
  if (session.state.pendingDecision) return 'Сначала ответьте на ожидающее решение.';
  if (session.state.stats.health <= 0) return 'Финансовые действия сейчас недоступны.';
  return '';
}

export function budgetResourceReady<T>(
  resource: { data: BudgetPage<T> | null; loading: boolean; error: string },
  version: number,
) {
  return !resource.loading && !resource.error && resource.data?.version === version
    && resource.data.available && resource.data.data !== null;
}

export function formatBudgetTenure(months: number) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years > 0 ? `${years} г.` : '', rest > 0 || years === 0 ? `${rest} мес.` : ''].filter(Boolean).join(' ');
}

export const raiseLabels = {
  results: 'Хорошие результаты',
  tenure: 'Большой стаж',
  responsibility: 'Больше ответственности',
};

export function budgetIcon(id: string) {
  const icons: Record<string, string> = {
    HOUSING: '🏠', FOOD_SHOPPING: '🛒', PROPERTY: '🛠️', CHILDREN_EDUCATION: '🎓',
    PETS: '🐾', HEALTH: '❤️', LEISURE_GIFTS: '🎁', OTHER: '🧾',
    warehouse: '📦', 'cook-assistant': '🍽️', support: '💻', repair: '🔧', analyst: '📊',
    'part-time-office': '💼', 'weekend-help': '📦', 'evening-support': '💻', tutoring: '📚',
    workshop: '🛠️', 'repair-service': '🔧', 'small-shop': '🏪',
  };
  return icons[id] ?? '💼';
}

export function getBudgetAssetIcon(session: Session, finances: Finances, assetId: string) {
  const asset = session.simulation?.adult?.assets.find((entry) => entry.id === assetId);
  return finances.purchases?.find((purchase) => purchase.id === asset?.purchaseId)?.icon
    ?? (asset?.kind === 'INVESTMENT' ? '💎' : '📦');
}
