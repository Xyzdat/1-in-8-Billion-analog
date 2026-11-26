import type { Finances } from '../../api/financeTypes';
import { formatServerMoney } from '../../game/financePresentation';
import styles from './GameTabs.module.scss';

export default function ServerFinanceSummary({ data }: { data: Finances }) {
  const { summary, currency } = data;
  const money = (value: number | null) => formatServerMoney(value, currency);
  const period = summary.periodMonths === null
    ? 'Период не указан'
    : `За последние ${summary.periodMonths} мес.`;
  const totals = [
    { title: 'Доходы', value: summary.income, className: styles.finances__income },
    { title: 'Расходы', value: summary.expenses, className: styles.finances__expenses },
  ];

  return (
    <>
      <div className={styles.finances__summary}>
        {totals.map(({ title, value, className }) => (
          <section className={styles.finances__total} key={title}>
            <h2>{title}</h2>
            <strong className={className}>{money(value)}</strong>
            <p>{period}</p>
          </section>
        ))}
      </div>

      <section className={styles.finances__card}>
        <div className={styles.finances__savings}>
          <span>
            <strong>Накопления</strong>
            <strong>{money(summary.savings)}</strong>
          </span>
        </div>
      </section>

      {currency === 'PPP_USD' && (
        <section className={styles.finances__card}>
          <h2>Чистая стоимость имущества</h2>
          <strong>{money(summary.netWorth)}</strong>
          <p className={styles.finances__description}>
            Международные доллары по ППС. Это не доступный остаток для покупок.
          </p>
        </section>
      )}
      {summary.asOfAge !== null && summary.asOfAge !== data.age && (
        <p className={styles.finances__notice}>
          Финансовый снимок относится к возрасту {summary.asOfAge} лет.
        </p>
      )}
    </>
  );
}
