import { useState } from 'react';
import type { Finances } from '../../api/financeTypes';
import { formatServerMoney } from '../../game/financePresentation';
import styles from './GameTabs.module.scss';

export default function ServerFinanceHistory({ data }: { data: Finances }) {
  const [expanded, setExpanded] = useState(false);
  const { ledger, purchases, currency } = data;
  const money = (value: number | null) => formatServerMoney(value, currency);
  const statuses = { PURCHASED: 'Приобретено', IN_PROGRESS: 'Обучение идёт', COMPLETED: 'Обучение завершено' };

  return (
    <>
      <section className={styles.finances__card}>
        <h2>История бюджета</h2>
        {ledger === null ? (
          <p className={styles.finances__description}>Нет данных о детализации операций.</p>
        ) : ledger.length === 0 ? (
          <p className={styles.finances__description}>Операций пока нет.</p>
        ) : (
          <>
            {(expanded ? ledger : ledger.slice(0, 8)).map((entry) => (
              <div className={styles.finances__ledgerEntry} key={entry.id}>
                <span>{Math.floor(entry.month / 12)} лет · {entry.title}</span>
                <span>
                  {entry.income > 0 && (
                    <strong className={styles.finances__income}>+{money(entry.income)}</strong>
                  )}
                  {entry.expense > 0 && (
                    <strong className={styles.finances__expenses}>−{money(entry.expense)}</strong>
                  )}
                  {entry.income === 0 && entry.expense === 0 && money(0)}
                </span>
              </div>
            ))}
            {ledger.length > 8 && (
              <button
                type="button"
                className={styles.finances__historyToggle}
                onClick={() => setExpanded((previous) => !previous)}
              >
                {expanded ? 'Свернуть' : 'Показать все операции'}
              </button>
            )}
          </>
        )}
      </section>

      <section className={styles.finances__card}>
        <h2>Мои покупки и обучение</h2>
        {purchases === null ? (
          <p className={styles.finances__description}>Нет данных о приобретениях.</p>
        ) : purchases.length === 0 ? (
          <p className={styles.finances__description}>Покупок пока нет.</p>
        ) : purchases.map((purchase) => (
          <div className={styles.finances__ledgerEntry} key={purchase.id}>
            <span>
              {purchase.icon} {purchase.title}
              {purchase.petName !== null && ` · ${purchase.petName}`}
              <small className={styles.finances__purchaseStatus}>{statuses[purchase.status]}</small>
            </span>
            <span>
              {money(purchase.price)}
              {purchase.yearlyCost !== null && <small>{money(purchase.yearlyCost)} в год</small>}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
