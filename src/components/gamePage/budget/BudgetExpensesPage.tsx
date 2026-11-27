import { useBudgetResource } from '../../../game/useBudgetResource';
import { budgetIcon, getBudgetAssetIcon } from '../../../game/budgetPresentation';
import type { BudgetViewProps } from './budgetUiTypes';
import { BudgetButton, BudgetCard, BudgetForecastCard, BudgetResourceStatus, BudgetRow, budgetMoney } from './BudgetPrimitives';
import styles from './Budget.module.scss';

export default function BudgetExpensesPage({ session, server, finances, navigate }: BudgetViewProps) {
  const expenses = useBudgetResource(session, server, 'expenses');
  const assets = useBudgetResource(session, server, 'assets');
  const data = expenses.data?.available ? expenses.data.data : null;

  return (
    <>
      <BudgetResourceStatus resource={expenses} />
      {data && (
        <>
          <BudgetCard>
            <div className={styles.budget__hero}>
              <h2>Расходы за год</h2>
              <strong className={styles.budget__expense}>{data.total > 0 ? '−' : ''}{budgetMoney(data.total)}</strong>
              <p className={styles.budget__muted}>В среднем — {budgetMoney(data.monthlyAverage)} в месяц</p>
            </div>
          </BudgetCard>
          {session.state.status !== 'COMPLETE' && (
            <BudgetForecastCard forecast={data.forecast} />
          )}
          <BudgetButton onClick={() => navigate({ page: 'jobs' })}>Найти работу</BudgetButton>
          <BudgetButton variant="outline" onClick={() => navigate({ page: 'assets' })}>
            Продать имущество
          </BudgetButton>
          <BudgetCard title="Траты за год">
            <div>
              {data.categories.map((category) => (
                <BudgetRow
                  key={category.id}
                  icon={budgetIcon(category.id)}
                  label={category.title}
                  value={budgetMoney(category.amount)}
                />
              ))}
            </div>
            {data.categories.length === 0 && (
              <p className={styles.budget__muted}>За последние 12 месяцев расходов не было.</p>
            )}
          </BudgetCard>
          <BudgetCard title="Кредиты и ипотека">
            {data.obligations.length === 0 && (
              <p className={styles.budget__muted}>Непогашенных обязательств нет.</p>
            )}
            {data.obligations.map((obligation) => (
              <section className={styles.budget__obligation} key={obligation.id}>
                <strong>{obligation.title}</strong>
                <p className={styles.budget__hint}>Остаток {budgetMoney(obligation.principal)}</p>
                <BudgetRow label="Основной платёж в месяц" value={budgetMoney(obligation.plannedPrincipalPayment)} />
                <BudgetRow label="Ближайшие проценты" value={budgetMoney(obligation.nextMonthlyInterest)} />
                {obligation.scheduledMonthsRemaining !== null && (
                  <p className={styles.budget__hint}>Осталось {obligation.scheduledMonthsRemaining} мес.</p>
                )}
              </section>
            ))}
            {data.obligations.length > 0 && (
              <p className={styles.budget__hint}>
                Основной долг учитывается в платежах отдельно от расходов. Срок погашения зависит от доступных средств.
              </p>
            )}
          </BudgetCard>
          <BudgetCard title="Что можно продать">
            <BudgetResourceStatus resource={assets} />
            {assets.data?.data?.assets.length === 0 && (
              <p className={styles.budget__muted}>Имущества для продажи пока нет.</p>
            )}
            {assets.data?.data?.assets.map((asset) => (
              <div key={asset.id}>
                <BudgetRow label={asset.title} value={budgetMoney(asset.salePrice)} icon={getBudgetAssetIcon(session, finances, asset.id)} />
                <BudgetButton variant="outline" onClick={() => navigate({ page: 'sale', assetId: asset.id })}>
                  Посмотреть продажу
                </BudgetButton>
                {asset.reason && (
                  <p className={styles.budget__hint}>{asset.reason}</p>
                )}
              </div>
            ))}
          </BudgetCard>
        </>
      )}
    </>
  );
}
