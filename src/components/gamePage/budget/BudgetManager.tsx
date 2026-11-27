import { useLayoutEffect, useRef, useState } from 'react';
import type { BudgetOutcome } from '../../../api/budgetTypes';
import { budgetActionBlockReason } from '../../../game/budgetPresentation';
import type { BudgetRoute, BudgetViewProps } from './budgetUiTypes';
import SpendingDialog from '../SpendingDialog';
import BudgetIncomePage from './BudgetIncomePage';
import BudgetExpensesPage from './BudgetExpensesPage';
import BudgetCareerPage from './BudgetCareerPage';
import BudgetBusinessPage from './BudgetBusinessPage';
import BudgetStrategiesPage from './BudgetStrategiesPage';
import BudgetAssetsPage, { BudgetSalePage } from './BudgetAssetsPage';
import { BudgetButton } from './BudgetPrimitives';
import styles from './Budget.module.scss';

const titles: Record<BudgetRoute['page'], string> = {
  income: 'Доходы', expenses: 'Расходы', jobs: 'Найти работу', raise: 'Повышение зарплаты',
  'side-jobs': 'Вторая работа', businesses: 'Открыть бизнес', strategies: 'Накопления',
  assets: 'Продать имущество', sale: 'Продать имущество',
};

type Props = Omit<BudgetViewProps, 'navigate' | 'execute'> & {
  initialPage: 'income' | 'expenses';
  onClose: () => void;
  onBlockTime: (blocked: boolean) => void;
};

export default function BudgetManager({ initialPage, onClose, onBlockTime, ...context }: Props) {
  const [history, setHistory] = useState<BudgetRoute[]>([{ page: initialPage }]);
  const [outcome, setOutcome] = useState<BudgetOutcome | null>(null);
  const route = history[history.length - 1];
  const content = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, number>());
  const key = `${route.page}:${route.assetId ?? ''}`;
  const { session, server } = context;
  const navigationLocked = server.busy || Boolean(server.failure?.retry);

  useLayoutEffect(() => {
    const dialog = content.current?.closest('dialog');
    if (dialog) dialog.scrollTop = positions.current.get(key) ?? 0;
    const savedPositions = positions.current;
    return () => {
      if (dialog) savedPositions.set(key, dialog.scrollTop);
    };
  }, [key]);

  function navigate(next: BudgetRoute) {
    if (navigationLocked) return;
    setHistory((previous) => {
      const index = previous.findIndex((entry) => entry.page === next.page && entry.assetId === next.assetId);
      return index >= 0 ? previous.slice(0, index + 1) : [...previous, next];
    });
  }

  const props: BudgetViewProps = {
    ...context,
    navigate,
    execute(action, optionId, version, onApplied) {
      if (navigationLocked || budgetActionBlockReason(session) || version !== session.version) return;
      setOutcome(null);
      server.manageBudget({ action, optionId, expectedVersion: version }, (result) => {
        setOutcome(result);
        if (result?.status === 'APPLIED') onApplied?.();
      });
    },
  };

  return (
    <SpendingDialog
      title={titles[route.page]}
      onClose={() => {
        if (navigationLocked) return;
        if (history.length > 1) setHistory((previous) => previous.slice(0, -1));
        else onClose();
      }}
      onBlockTime={onBlockTime}
      busy={navigationLocked}
      closeLabel={history.length > 1 ? 'Назад' : 'Вернуться в игру'}
    >
      <div ref={content} className={styles.budget}>
        {server.failure && (
          <div className={styles.budget__notice} role="alert">
            <p>{server.failure.message}</p>
            <BudgetButton
              variant="outline"
              disabled={server.busy}
              onClick={server.failure.retry ?? server.refresh}
            >
              {server.failure.retry ? 'Повторить запрос' : 'Обновить данные'}
            </BudgetButton>
          </div>
        )}
        {(outcome || server.notice) && !server.failure && (
          <div className={styles.budget__notice} role="status">
            {outcome?.status === 'DECLINED' && (
              <strong>Заявка не одобрена. </strong>
            )}
            {outcome?.message ?? server.notice}
          </div>
        )}
        <div key={key} className={styles.budget}>
          {route.page === 'income' && (
            <BudgetIncomePage {...props} />
          )}
          {route.page === 'expenses' && (
            <BudgetExpensesPage {...props} />
          )}
          {(route.page === 'jobs' || route.page === 'raise' || route.page === 'side-jobs') && (
            <BudgetCareerPage {...props} mode={route.page} />
          )}
          {route.page === 'businesses' && (
            <BudgetBusinessPage {...props} />
          )}
          {route.page === 'strategies' && (
            <BudgetStrategiesPage {...props} />
          )}
          {route.page === 'assets' && (
            <BudgetAssetsPage {...props} />
          )}
          {route.page === 'sale' && route.assetId && (
            <BudgetSalePage {...props} assetId={route.assetId} />
          )}
        </div>
        {server.busy && (
          <p role="status">Сохраняем изменения…</p>
        )}
      </div>
    </SpendingDialog>
  );
}
