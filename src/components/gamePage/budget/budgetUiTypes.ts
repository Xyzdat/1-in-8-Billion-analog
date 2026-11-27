import type { BudgetAction } from '../../../api/budgetTypes';
import type { Finances } from '../../../api/financeTypes';
import type { Session } from '../../../api/sessionTypes';
import type { ServerLife } from '../../../game/useServerLife';

export type BudgetRoute = {
  page: 'income' | 'expenses' | 'jobs' | 'raise' | 'side-jobs' | 'businesses' | 'strategies' | 'assets' | 'sale';
  assetId?: string;
};

export type BudgetViewProps = {
  session: Session;
  server: ServerLife;
  finances: Finances;
  navigate: (route: BudgetRoute) => void;
  execute: (action: BudgetAction, optionId: string, version: number, onApplied?: () => void) => void;
};

