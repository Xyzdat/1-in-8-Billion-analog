import { useState } from 'react';
import { useBudgetResource } from '../../../game/useBudgetResource';
import { budgetActionBlockReason, budgetResourceReady } from '../../../game/budgetPresentation';
import type { BudgetViewProps } from './budgetUiTypes';
import { BudgetButton, BudgetCard, BudgetOption, BudgetResourceStatus } from './BudgetPrimitives';
import styles from './Budget.module.scss';

export default function BudgetStrategiesPage({ session, server, navigate, execute }: BudgetViewProps) {
  const resource = useBudgetResource(session, server, 'strategies');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const data = resource.data?.available ? resource.data.data : null;
  const selected = data?.options.find((option) => option.id === (selectedId ?? data.selectedId));
  const reason = budgetActionBlockReason(session);
  const blocked = Boolean(reason) || server.busy || Boolean(server.failure?.retry)
    || !budgetResourceReady(resource, session.version) || !selected?.available || selected.id === data?.selectedId;

  return (
    <>
      <BudgetResourceStatus resource={resource} />
      {data && (
        <BudgetCard title="Как вкладывать">
          <p className={styles.budget__muted}>Здесь ты выбираешь, где хранить сбережения.</p>
          <div className={styles.budget__list}>
            {data.options.map((option) => (
              <BudgetOption
                key={option.id}
                id={option.id}
                name="strategy"
                selected={selected?.id === option.id}
                disabled={!option.available || server.busy}
                onSelect={() => setSelectedId(option.id)}
              >
                <b>{option.title}</b>
                <small>{option.description}</small>
                {option.annualBasisPoints !== null && (
                  <small>{option.annualBasisPoints / 100}% годовых</small>
                )}
                {option.reason && (
                  <small>{option.reason}</small>
                )}
              </BudgetOption>
            ))}
          </div>
          {reason && (
            <p className={styles.budget__hint}>{reason}</p>
          )}
          <BudgetButton
            disabled={blocked}
            onClick={() => {
              if (selected && resource.data) {
                execute('SET_STRATEGY', selected.id, resource.data.version, () => navigate({ page: 'income' }));
              }
            }}
          >
            Сменить
          </BudgetButton>
          <BudgetButton variant="quiet" onClick={() => navigate({ page: 'income' })}>Назад</BudgetButton>
        </BudgetCard>
      )}
    </>
  );
}
