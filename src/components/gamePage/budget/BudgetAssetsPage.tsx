import { sessionsApi } from '../../../api';
import { useSessionResource } from '../../../game/useSessionResource';
import { useBudgetResource } from '../../../game/useBudgetResource';
import { budgetActionBlockReason, budgetResourceReady, getBudgetAssetIcon } from '../../../game/budgetPresentation';
import type { BudgetViewProps } from './budgetUiTypes';
import { BudgetButton, BudgetCard, BudgetForecastCard, BudgetResourceStatus, BudgetRow, budgetMoney } from './BudgetPrimitives';
import styles from './Budget.module.scss';

export default function BudgetAssetsPage(props: BudgetViewProps) {
  const { session, server, navigate } = props;
  const resource = useBudgetResource(session, server, 'assets');
  const expenses = useBudgetResource(session, server, 'expenses');
  const data = resource.data?.available ? resource.data.data : null;
  const forecast = expenses.data?.data?.forecast;

  return (
    <>
      <BudgetCard>
        <div className={styles.budget__hero}>
          <span className={styles.budget__icon} aria-hidden="true">💰</span>
          <h2>Освободи деньги для платежей</h2>
        </div>
      </BudgetCard>
      <BudgetResourceStatus resource={expenses} />
      {forecast && session.state.status !== 'COMPLETE' && (
        <BudgetForecastCard forecast={forecast} />
      )}
      <BudgetResourceStatus resource={resource} />
      {data && (
        <>
          <BudgetCard title="Твоё имущество">
            {data.assets.length === 0 && (
              <p className={styles.budget__muted}>Имущества для продажи пока нет.</p>
            )}
            {data.assets.map((asset) => (
              <div key={asset.id}>
                <div className={styles.budget__employment}>
                  <span className={styles.budget__icon} aria-hidden="true">{getBudgetAssetIcon(session, props.finances, asset.id)}</span>
                  <div>
                    <h3>{asset.title}</h3>
                    <p className={styles.budget__hint}>Твоя доля: {asset.ownershipPercent}%</p>
                    <h2 className={styles.budget__income}>{budgetMoney(asset.salePrice)}</h2>
                  </div>
                </div>
                {asset.reason && (
                  <p className={styles.budget__hint}>{asset.reason}</p>
                )}
                <BudgetButton variant="outline" onClick={() => navigate({ page: 'sale', assetId: asset.id })}>
                  Выбрать
                </BudgetButton>
              </div>
            ))}
          </BudgetCard>
          <BudgetCard title="Перед продажей">
            <p>Покажем, сколько денег ты получишь и какие платежи изменятся.</p>
          </BudgetCard>
          {data.sales.length > 0 && (
            <BudgetCard title="История продаж">
              {data.sales.map((sale) => (
                <BudgetRow
                  key={sale.assetId}
                  label={`${Math.floor(sale.month / 12)} лет · ${sale.title}`}
                  value={budgetMoney(sale.net)}
                />
              ))}
            </BudgetCard>
          )}
        </>
      )}
      <BudgetButton variant="outline" onClick={() => navigate({ page: 'expenses' })}>Назад к расходам</BudgetButton>
    </>
  );
}

export function BudgetSalePage(props: BudgetViewProps & { assetId: string }) {
  const { session, server, assetId, navigate, execute } = props;
  const resource = useSessionResource(session, server, `budget:sale:${assetId}`,
    (signal) => sessionsApi.getBudgetSalePreview(session.id, assetId, signal));
  const expenses = useBudgetResource(session, server, 'expenses');
  const data = resource.data?.available ? resource.data.data : null;
  const reason = budgetActionBlockReason(session);
  const blocked = Boolean(reason) || server.busy || Boolean(server.failure?.retry)
    || !budgetResourceReady(resource, session.version) || !data?.available;

  return (
    <>
      <BudgetResourceStatus resource={resource} />
      {data && (
        <>
          <BudgetCard>
            <div className={styles.budget__hero}>
              <span className={styles.budget__icon} aria-hidden="true">{getBudgetAssetIcon(session, props.finances, assetId)}</span>
              <h2>{data.title}</h2>
              <strong className={styles.budget__income}>{budgetMoney(data.salePrice)}</strong>
            </div>
          </BudgetCard>
          <BudgetCard title={data.debtPayoff > 0 ? 'Расчёт продажи' : 'Что изменится'}>
            <div>
              <BudgetRow label="Стоимость продажи" value={budgetMoney(data.salePrice)} icon="💰" tone="income" />
              {data.debtPayoff > 0 && (
                <BudgetRow label="Погашение кредита" value={`−${budgetMoney(data.debtPayoff)}`} icon="🏦" tone="expense" />
              )}
              <BudgetRow
                label={data.net < 0 ? 'Доплата со счёта' : 'Получишь на счёт'}
                value={budgetMoney(data.net)}
                icon="👛"
                tone={data.net < 0 ? 'expense' : 'income'}
              />
            </div>
            {data.debtPayoff > 0 && (
              <p className={styles.budget__hint}>Связанные обязательства будут погашены при продаже.</p>
            )}
            <p className={styles.budget__hint}>{data.priceRule}</p>
          </BudgetCard>
          <BudgetCard title="Что изменится">
            {expenses.data?.data?.obligations.filter((obligation) => data.obligationIds.includes(obligation.id)).map((obligation) => (
              <BudgetRow
                key={obligation.id}
                label={`${obligation.title}: основной платёж больше не нужен`}
                value={`${budgetMoney(obligation.plannedPrincipalPayment)} / месяц`}
                icon="🏦"
                tone="income"
              />
            ))}
            {data.yearlyUpkeepStopped > 0 && (
              <BudgetRow
                label="Содержание больше не нужно оплачивать"
                value={`−${budgetMoney(data.yearlyUpkeepStopped)} / год`}
                icon="📅"
                tone="income"
              />
            )}
            {data.rentalModelled && data.rentalIncomeStopped !== null && data.rentalIncomeStopped > 0 && (
              <BudgetRow label="Доход от аренды прекратится" value={budgetMoney(data.rentalIncomeStopped)} tone="expense" />
            )}
            <p className={styles.budget__notice}>Имущество исчезнет из твоей собственности.</p>
            <BudgetRow label="Денег после продажи" value={budgetMoney(data.balanceAfterSale)} />
          </BudgetCard>
          {data.forecast && session.state.status !== 'COMPLETE' && (
            <BudgetForecastCard forecast={data.forecast} />
          )}
          {(reason || data.reason) && (
            <p className={styles.budget__muted}>{reason || data.reason}</p>
          )}
          <BudgetButton
            disabled={blocked}
            onClick={() => {
              if (resource.data) {
                execute('SELL_ASSET', data.assetId, resource.data.version, () => navigate({ page: 'expenses' }));
              }
            }}
          >
            {data.debtPayoff > 0 ? 'Продать и закрыть кредит' : `Продать за ${budgetMoney(data.salePrice)}`}
          </BudgetButton>
        </>
      )}
      <BudgetButton variant="outline" onClick={() => navigate({ page: 'assets' })}>Отмена</BudgetButton>
    </>
  );
}
