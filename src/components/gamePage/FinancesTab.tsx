import { useState } from 'react';
import { relationshipExpenses, spendingCategories } from '../../mocks/gameTabs';
import type { FinanceState } from '../../game/finances';
import { getShopItems } from '../../mocks/spendingCatalog';
import type { ShopSection } from '../../mocks/spendingCatalog';
import type { Purchase } from '../../game/spending';
import styles from './GameTabs.module.scss';

type Props = {
  age: number;
  finances: FinanceState;
  purchases?: Purchase[];
  onOpen?: (section: ShopSection, itemId?: string) => void;
};

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

function FinanceSummary({ age, finances }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={styles.finances__summary}>
        <section className={styles.finances__total}>
          <h2>Доходы</h2>
          <strong className={styles.finances__income}>{money(finances.income)}</strong>
          <p>За последние 12 месяцев</p>
        </section>
        <section className={styles.finances__total}>
          <h2>Расходы</h2>
          <strong className={styles.finances__expenses}>{money(finances.expenses)}</strong>
          <p>За последние 12 месяцев</p>
        </section>
      </div>

      <section className={styles.finances__card}>
        <button
          type="button"
          className={styles.finances__savings}
          aria-expanded={expanded}
          aria-controls="savings-details"
          onClick={() => setExpanded(!expanded)}
        >
          <span>
            <strong>Накопления</strong>
            <strong>{money(finances.savings)}</strong>
          </span>
          <span className={styles.finances__savingsCaption}>
            Остаток личного бюджета
            <span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
          </span>
        </button>
        {expanded && (
          <p className={styles.finances__details} id="savings-details">
            {age < 18
              ? 'Карманные деньги и подработка пополняют личный бюджет. Основные расходы покрывает семья.'
              : `Текущий путь: ${finances.career}. Суммы начисляются каждый игровой месяц.`}
            {finances.debt > 0 && ` Непокрытые расходы: ${money(finances.debt)}.`}
          </p>
        )}
      </section>
    </>
  );
}

export default function FinancesTab({ age, finances, purchases = [], onOpen }: Props) {
  const [showAll, setShowAll] = useState(false);
  const ledger = [...finances.ledger].reverse();
  return (
    <div className={styles.finances} aria-label="Траты и вложения">
      <FinanceSummary age={age} finances={finances} />

      {age < 18 && (
        <p className={styles.finances__notice}>
          Основные расходы покрывает семья. Здесь учитываются карманные деньги, подработка и личные покупки из событий.
        </p>
      )}

      <section className={styles.finances__card}>
        <h2>История бюджета</h2>
        {finances.debt > 0 && (
          <p className={styles.finances__details}>Непокрытые расходы: {money(finances.debt)}. Следующие доходы сначала покроют эту сумму.</p>
        )}
        {!ledger.length && (
          <p className={styles.finances__description}>
            Личных операций пока нет. Карманные деньги появятся с 6 лет.
          </p>
        )}
        {(showAll ? ledger : ledger.slice(0, 8)).map((entry) => (
          <div className={styles.finances__ledgerEntry} key={entry.id}>
            <span>{Math.floor(entry.age)} лет · {entry.title}</span>
            <span>
              {entry.income > 0 && (
                <strong className={styles.finances__income}>+{money(entry.income)}</strong>
              )}
              {entry.expenses > 0 && (
                <strong className={styles.finances__expenses}>−{money(entry.expenses)}</strong>
              )}
            </span>
          </div>
        ))}
        {ledger.length > 8 && (
          <button className={styles.finances__historyToggle} type="button" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Свернуть' : 'Показать все операции'}
          </button>
        )}
      </section>

      <section className={styles.finances__card}>
        <h2>Отношения</h2>
        {relationshipExpenses.map((expense) => (
          <button
            type="button"
            className={styles.finances__action}
            key={expense.id}
            onClick={() => onOpen?.('relationships', expense.id)}
          >
            <span className={styles.finances__icon} aria-hidden="true">{expense.icon}</span>
            <div className={styles.finances__actionText}>
              <h3>{expense.title}</h3>
              <p>{expense.effect}</p>
            </div>
            <strong className={styles.finances__price}>{money(expense.price)}</strong>
          </button>
        ))}
      </section>

      {spendingCategories.map((category) => (
        <section className={styles.finances__card} key={category.id}>
          <div className={styles.finances__heading}>
            <h2>{category.title}</h2>
            {category.id === 'moving' && (
              <span>🔒 Доступно с 18 лет</span>
            )}
          </div>
          {category.description && (
            <p className={styles.finances__description}>{category.description}</p>
          )}
          {category.actions.map((action) => (
            <button
              type="button"
              className={styles.finances__action}
              onClick={() => onOpen?.(category.id === 'moving'
                ? action.title.includes('страну') ? 'country' : 'city'
                : category.id as ShopSection)}
              key={action.title}
            >
              <span className={styles.finances__icon} aria-hidden="true">{action.icon}</span>
              <span className={styles.finances__actionText}>
                <strong>{action.title}</strong>
                {'note' in action && (
                  <small>{action.note}</small>
                )}
              </span>
              <span className={styles.finances__chevron} aria-hidden="true">›</span>
            </button>
          ))}
        </section>
      ))}

      {purchases.length > 0 && (
        <section className={styles.finances__card}>
          <h2>Мои покупки и обучение</h2>
          {purchases.map((purchase) => {
            const item = getShopItems(purchase.section, purchase.country).find((entry) => entry.id === purchase.itemId);
            if (!item) return null;

            return (
              <div className={styles.finances__ledgerEntry} key={purchase.id}>
                <span>
                  {item.icon} {item.title}{purchase.petName ? ` · ${purchase.petName}` : ''}
                  {item.durationMonths ? age >= purchase.age + item.durationMonths / 12 ? ' · Обучение завершено' : ' · Обучение идёт' : ''}
                </span>
                <span>
                  {money(item.price)}
                  {item.yearlyCost ? ` · ${money(item.yearlyCost)} в год` : ''}
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
