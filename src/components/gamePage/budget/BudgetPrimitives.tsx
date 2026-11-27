import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { BudgetForecast, BudgetPage } from '../../../api/budgetTypes';
import { formatServerMoney } from '../../../game/financePresentation';
import styles from './Budget.module.scss';

export const budgetMoney = (value: number | null) => formatServerMoney(value, 'RUB');

export function BudgetCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={styles.budget__card}>
      {title && (
        <h2>{title}</h2>
      )}
      {children}
    </section>
  );
}

export function BudgetButton({
  variant = 'primary', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'danger' | 'quiet' }) {
  return (
    <button
      {...props}
      type="button"
      className={`${styles.budget__button} ${styles[`budget__button--${variant}`]} ${className}`}
    />
  );
}

export function BudgetRow({
  label, value, icon, tone,
}: { label: ReactNode; value?: ReactNode; icon?: string; tone?: 'income' | 'expense' }) {
  return (
    <div className={styles.budget__row}>
      {icon && (
        <span className={styles.budget__smallIcon} aria-hidden="true">{icon}</span>
      )}
      <span className={styles.budget__rowLabel}>{label}</span>
      {value != null && (
        <strong className={tone ? styles[`budget__${tone}`] : undefined}>{value}</strong>
      )}
    </div>
  );
}

export function BudgetOption({
  id, name, selected, disabled, onSelect, icon, children,
}: {
  id: string;
  name: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <label className={`${styles.budget__option} ${selected ? styles['budget__option--selected'] : ''} ${disabled ? styles['budget__option--disabled'] : ''}`}>
      {icon && (
        <span className={styles.budget__icon} aria-hidden="true">{icon}</span>
      )}
      <span className={styles.budget__optionText}>{children}</span>
      <input
        type="radio"
        name={name}
        value={id}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
      />
    </label>
  );
}

export function BudgetResourceStatus<T>({
  resource,
}: {
  resource: { data: BudgetPage<T> | null; loading: boolean; error: string; retry: () => void };
}) {
  if (resource.error) {
    return (
      <BudgetCard>
        <p role="alert">{resource.error}</p>
        <BudgetButton variant="outline" onClick={resource.retry}>Повторить загрузку</BudgetButton>
      </BudgetCard>
    );
  }
  if (resource.loading) {
    return (
      <p className={styles.budget__muted} role="status">Загрузка данных…</p>
    );
  }
  if (resource.data && (!resource.data.available || !resource.data.data)) {
    return (
      <BudgetCard>
        <p>{resource.data.reason ?? 'Подробные данные этого раздела недоступны.'}</p>
      </BudgetCard>
    );
  }
  return null;
}

export function BudgetForecastCard({ forecast }: { forecast: BudgetForecast }) {
  return (
    <section className={`${styles.budget__forecast} ${forecast.deficit > 0 ? styles['budget__forecast--deficit'] : ''}`}>
      <strong>
        {forecast.deficit > 0 ? 'Не хватает на ближайшие платежи' : 'После ближайших платежей'}
      </strong>
      <BudgetRow label="Доступно сейчас" value={budgetMoney(forecast.available)} />
      <BudgetRow label="Ожидаемые поступления за 2 месяца" value={budgetMoney(forecast.expectedIncome)} />
      <BudgetRow label="Платежи за 2 месяца" value={budgetMoney(forecast.requiredPayments)} />
      <BudgetRow
        label={forecast.deficit > 0 ? 'Не хватает' : 'Останется'}
        value={budgetMoney(forecast.deficit > 0 ? forecast.deficit : forecast.projectedBalance)}
        tone={forecast.deficit > 0 ? 'expense' : 'income'}
      />
      <p className={styles.budget__hint}>{forecast.assumption}</p>
    </section>
  );
}
