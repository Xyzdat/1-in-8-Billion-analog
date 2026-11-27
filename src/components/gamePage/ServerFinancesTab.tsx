import { useState } from 'react';
import type { Finances, SpendingCategoryId } from '../../api/financeTypes';
import type { Session } from '../../api/sessionTypes';
import type { ServerLife } from '../../game/useServerLife';
import { formatServerMoney, formatSpendingEffects, groupSpendingCategories } from '../../game/financePresentation';
import ServerFinanceSummary from './ServerFinanceSummary';
import ServerFinanceHistory from './ServerFinanceHistory';
import ServerSpendingPanel from './ServerSpendingPanel';
import BudgetManager from './budget/BudgetManager';
import styles from './GameTabs.module.scss';

export type ServerFinancesTabProps = {
  session: Session;
  server: ServerLife;
  resource: { data: Finances | null; loading: boolean; error: string; retry: () => void };
  onBlockTime: (blocked: boolean) => void;
};

export default function ServerFinancesTab({ session, server, resource, onBlockTime }: ServerFinancesTabProps) {
  const [panel, setPanel] = useState<{ category: SpendingCategoryId; itemId?: string } | null>(null);
  const [budgetPage, setBudgetPage] = useState<'income' | 'expenses' | null>(null);
  const { data, loading, error, retry } = resource;
  const blocked = session.state.status === 'COMPLETE' || loading || Boolean(error) || server.busy || Boolean(server.failure?.retry) || data?.version !== session.version;

  return (
    <div className={styles.finances} aria-label="Бюджет">
      {/* {loading && <p className={styles.finances__notice} role="status">Обновление бюджета…</p>} */}
      {error && (
        <section className={styles.finances__card}>
          <p role="alert">{error}</p>
          <button type="button" className={styles.finances__historyToggle} onClick={retry} disabled={loading}>
            Повторить загрузку бюджета
          </button>
        </section>
      )}

      {data && (
        <>
          <ServerFinanceSummary data={data} onOpen={setBudgetPage} />
          {session.provider === '1in8b' && (
            <p className={styles.finances__notice}>
              Суммы в международных долларах по ППС. Предложения доступны для просмотра.
            </p>
          )}

          {groupSpendingCategories(data.categories).map((group) => (
            <section className={styles.finances__card} key={group.id}>
              <div className={styles.finances__heading}>
                <h2>{group.title}</h2>
                {group.categories[0]?.minAge != null && data.age < group.categories[0].minAge && (
                  <span>🔒 Доступно с {group.categories[0].minAge} лет</span>
                )}
              </div>
              {group.categories[0]?.description && (
                <p className={styles.finances__description}>{group.categories[0].description}</p>
              )}
              {group.categories.map((category) => (
                <div key={category.id}>
                  {category.actions.length > 0 ? category.actions.map((offer) => (
                    <button
                      type="button"
                      className={styles.finances__action}
                      key={offer.id}
                      disabled={blocked}
                      onClick={() => setPanel({ category: category.id, itemId: offer.id })}
                    >
                      <span className={styles.finances__icon} aria-hidden="true">{offer.icon ?? '🛍️'}</span>
                      <span className={styles.finances__actionText}>
                        <strong>{offer.title}</strong>
                        <small>{formatSpendingEffects(offer.effects) || offer.description}</small>
                      </span>
                      <strong className={styles.finances__price}>{formatServerMoney(offer.price, data.currency)}</strong>
                    </button>
                  )) : (
                    <button
                      type="button"
                      className={styles.finances__action}
                      disabled={blocked}
                      onClick={() => setPanel({ category: category.id })}
                    >
                      <span className={styles.finances__icon} aria-hidden="true">
                        {category.minAge !== null && data.age < category.minAge ? '🔒' : category.icon ?? '🛍️'}
                      </span>
                      <span className={styles.finances__actionText}>
                        <strong>{category.actionTitle ?? category.title}</strong>
                        {category.id === 'education' && category.priceFrom !== null && (
                          <small>
                            От {formatServerMoney(category.priceFrom, data.currency)}
                            {category.minAge !== null && ` · с ${category.minAge} лет`}
                          </small>
                        )}
                      </span>
                      <span className={styles.finances__chevron} aria-hidden="true">›</span>
                    </button>
                  )}
                </div>
              ))}
            </section>
          ))}

          <ServerFinanceHistory data={data} />
        </>
      )}

      {panel && (
        <ServerSpendingPanel
          key={panel.category}
          session={session}
          server={server}
          categoryId={panel.category}
          initialItemId={panel.itemId}
          onClose={() => setPanel(null)}
          onBlockTime={onBlockTime}
        />
      )}
      {budgetPage && data && (
        <BudgetManager
          initialPage={budgetPage}
          session={session}
          server={server}
          finances={data}
          onClose={() => setBudgetPage(null)}
          onBlockTime={onBlockTime}
        />
      )}
    </div>
  );
}
