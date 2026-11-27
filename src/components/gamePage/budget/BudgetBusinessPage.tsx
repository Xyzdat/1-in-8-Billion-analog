import { useState } from 'react';
import { useBudgetResource } from '../../../game/useBudgetResource';
import { budgetActionBlockReason, budgetIcon, budgetResourceReady } from '../../../game/budgetPresentation';
import type { BudgetViewProps } from './budgetUiTypes';
import { BudgetButton, BudgetCard, BudgetOption, BudgetResourceStatus, budgetMoney } from './BudgetPrimitives';
import styles from './Budget.module.scss';

export default function BudgetBusinessPage({ session, server, finances, navigate, execute }: BudgetViewProps) {
  const resource = useBudgetResource(session, server, 'businesses');
  const [selectedId, setSelectedId] = useState('');
  const data = resource.data?.available ? resource.data.data : null;
  const selected = data?.offers.find((offer) => offer.id === selectedId)
    ?? data?.offers.find((offer) => offer.available) ?? data?.offers[0];
  const reason = budgetActionBlockReason(session);
  const blocked = Boolean(reason) || server.busy || Boolean(server.failure?.retry)
    || !budgetResourceReady(resource, session.version) || !selected?.available;

  return (
    <>
      <BudgetResourceStatus resource={resource} />
      {data && (
        <>
          <BudgetCard>
            <div className={styles.budget__hero}>
              <p>Накоплено</p>
              <strong>{budgetMoney(finances.summary.availableBalance)}</strong>
            </div>
          </BudgetCard>
          <div>
            <h2>Выбери своё дело</h2>
            <p className={styles.budget__muted}>Вложения спишутся при открытии.</p>
          </div>
          {data.current && (
            <BudgetCard title="Текущий бизнес">
              <strong>{data.current.title}</strong>
              <p>Чистый результат за 12 месяцев: {budgetMoney(data.current.net)}</p>
            </BudgetCard>
          )}
          <div className={styles.budget__list}>
            {data.offers.map((offer) => (
              <BudgetOption
                key={offer.id}
                id={offer.id}
                name="business"
                selected={selected?.id === offer.id}
                disabled={!offer.available || server.busy}
                onSelect={() => setSelectedId(offer.id)}
                icon={budgetIcon(offer.id)}
              >
                <strong>{offer.title}</strong>
                <span>Вложения: {budgetMoney(offer.investment)}</span>
                <b className={styles.budget__income}>
                  Цель чистого дохода: {budgetMoney(offer.currentNetTarget)} / месяц
                </b>
                <small>{offer.expectation}</small>
                <small>Риск: {offer.risk} из 100</small>
                {offer.reason && (
                  <small>{offer.reason}</small>
                )}
              </BudgetOption>
            ))}
          </div>
          <p className={styles.budget__notice}>{data.compatibility}</p>
          {(reason || selected?.reason) && (
            <p className={styles.budget__muted}>{reason || selected?.reason}</p>
          )}
          <BudgetButton
            disabled={blocked}
            onClick={() => {
              if (selected && resource.data) {
                execute('OPEN_BUSINESS', selected.id, resource.data.version, () => navigate({ page: 'income' }));
              }
            }}
          >
            Открыть
          </BudgetButton>
          <BudgetButton variant="outline" onClick={() => navigate({ page: 'income' })}>Назад к доходам</BudgetButton>
        </>
      )}
    </>
  );
}
