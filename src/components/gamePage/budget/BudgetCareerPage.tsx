import { useState } from 'react';
import { budgetActionBlockReason, budgetIcon, budgetResourceReady, formatBudgetTenure, raiseLabels } from '../../../game/budgetPresentation';
import { useBudgetResource } from '../../../game/useBudgetResource';
import type { BudgetViewProps } from './budgetUiTypes';
import { BudgetButton, BudgetCard, BudgetOption, BudgetResourceStatus, BudgetRow, budgetMoney } from './BudgetPrimitives';
import styles from './Budget.module.scss';

type Props = BudgetViewProps & { mode: 'jobs' | 'side-jobs' | 'raise' };
type JobFilter = 'all' | 'experience' | 'none';

export default function BudgetCareerPage({ session, server, navigate, execute, mode }: Props) {
  const resource = useBudgetResource(session, server, mode === 'side-jobs' ? 'side-jobs' : 'jobs');
  const income = useBudgetResource(session, server, 'income', mode === 'side-jobs');
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<JobFilter>('all');
  const data = resource.data?.available ? resource.data.data : null;
  const options = data?.offers.filter((offer) => filter === 'all'
    || (filter === 'experience' ? offer.experienceMatch : offer.noExperience)) ?? [];
  const selected = options.find((option) => option.id === selectedId)
    ?? options.find((option) => option.available) ?? options[0];
  const selectedRaise = data?.raiseGrounds.find((option) => option.id === selectedId)
    ?? data?.raiseGrounds.find((option) => option.available) ?? data?.raiseGrounds[0];
  const choice = mode === 'raise' ? selectedRaise : selected;
  const reason = budgetActionBlockReason(session);
  const blocked = Boolean(reason) || server.busy || Boolean(server.failure?.retry)
    || !budgetResourceReady(resource, session.version) || !choice?.available;

  return (
    <>
      <BudgetResourceStatus resource={resource} />
      {data && (
        <>
          {mode !== 'raise' && (
            <div>
              <h2>{mode === 'side-jobs' ? 'Дополнительный доход' : 'Начни новую карьеру'}</h2>
              <p className={styles.budget__muted}>
                {mode === 'side-jobs' ? 'Выбери подработку, которую сможешь совмещать с основной.' : 'Выбери вакансию и отправь отклик.'}
              </p>
            </div>
          )}
          {mode === 'side-jobs' && income.data?.data?.primary && income.data.data.primary.status !== 'BUSINESS' && (
            <BudgetCard title="Основная работа">
              <strong>{income.data.data.primary.title}</strong>
              {income.data.data.primary.hoursPerWeek !== null && (
                <p className={styles.budget__hint}>{income.data.data.primary.hoursPerWeek} ч. в неделю</p>
              )}
            </BudgetCard>
          )}
          <BudgetCard title={mode === 'raise' ? 'Твоя работа' : undefined}>
            <div className={styles.budget__employment}>
              <span className={styles.budget__icon} aria-hidden="true">💼</span>
              <div>
                <strong>{data.current?.title ?? (mode === 'side-jobs' ? 'Сейчас нет дополнительной работы' : 'Сейчас ты не работаешь')}</strong>
                {data.current && (
                  <small>
                    {data.current.schedule}
                    {data.current.hoursPerWeek != null && ` · ${data.current.hoursPerWeek} ч. в неделю`}
                  </small>
                )}
              </div>
            </div>
            {mode === 'raise' && data.current && (
              <>
                <p>Стаж на этом месте: <b>{formatBudgetTenure(data.current.currentTenureMonths)}</b></p>
                <div className={styles.budget__columns}>
                  <div>
                    <small>Сейчас, в месяц</small>
                    <strong>{budgetMoney(selectedRaise?.currentPay ?? data.current.basePay)}</strong>
                  </div>
                  <div>
                    <small>При одобрении, в месяц</small>
                    <strong className={styles.budget__income}>{budgetMoney(selectedRaise?.proposedPay ?? null)}</strong>
                  </div>
                </div>
              </>
            )}
          </BudgetCard>
          {mode === 'jobs' && (
            <div className={styles.budget__tabs} role="group" aria-label="Фильтр вакансий">
              {([
                ['all', 'Все'], ['experience', 'По опыту'], ['none', 'Без опыта'],
              ] as const).map(([value, label]) => (
                <BudgetButton
                  key={value}
                  variant={filter === value ? 'primary' : 'outline'}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </BudgetButton>
              ))}
            </div>
          )}
          {mode === 'raise' ? (
            <BudgetCard title="Основание для повышения">
              {data.raiseGrounds.map((offer) => (
                <BudgetOption
                  key={offer.id}
                  id={offer.id}
                  name="raise"
                  selected={selectedRaise?.id === offer.id}
                  disabled={!offer.available || server.busy}
                  onSelect={() => setSelectedId(offer.id)}
                >
                  <b>{raiseLabels[offer.id]}</b>
                  {offer.reason && (
                    <small>{offer.reason}</small>
                  )}
                </BudgetOption>
              ))}
              {data.raiseGrounds.length === 0 && (
                <p className={styles.budget__muted}>Сейчас повышение недоступно.</p>
              )}
            </BudgetCard>
          ) : (
            <div className={styles.budget__list}>
              {options.map((offer) => (
                <BudgetOption
                  key={offer.id}
                  id={offer.id}
                  name="job"
                  selected={selected?.id === offer.id}
                  disabled={!offer.available || server.busy}
                  onSelect={() => setSelectedId(offer.id)}
                  icon={budgetIcon(offer.id)}
                >
                  <strong>{offer.title}</strong>
                  <b className={styles.budget__income}>{budgetMoney(offer.basePay)} / месяц</b>
                  <small>{offer.schedule} · {offer.hoursPerWeek} ч. в неделю</small>
                  <span className={styles.budget__badge}>
                    {offer.noExperience ? 'Без опыта' : offer.experienceMatch ? 'Опыт подходит' : 'Требуется опыт'}
                  </span>
                  {offer.reason && (
                    <small>{offer.reason}</small>
                  )}
                </BudgetOption>
              ))}
              {options.length === 0 && (
                <BudgetCard>
                  <p>По этому фильтру вакансий нет.</p>
                </BudgetCard>
              )}
            </div>
          )}
          {mode === 'raise' && selectedRaise && (
            <BudgetCard title="Что изменится">
              <BudgetRow label="Оплата при одобрении, в месяц" value={budgetMoney(selectedRaise.proposedPay)} tone="income" />
              <BudgetRow label="Дополнительная нагрузка" value={`${selectedRaise.extraHours} ч. в неделю`} />
              <p className={styles.budget__hint}>Решение примет руководитель. Повышение не гарантировано.</p>
            </BudgetCard>
          )}
          {mode === 'side-jobs' && (
            <div className={styles.budget__forecast}>
              <strong>Меньше времени на отдых</strong>
              <p>Дополнительная работа может снизить здоровье и счастье. Сервер проверит совместимость нагрузки.</p>
            </div>
          )}
          {(reason || choice?.reason) && (
            <p className={styles.budget__muted}>{reason || choice?.reason}</p>
          )}
          <BudgetButton
            disabled={blocked}
            onClick={() => {
              if (!choice || !resource.data) return;
              execute(mode === 'raise' ? 'REQUEST_RAISE' : mode === 'side-jobs' ? 'TAKE_SIDE_JOB' : 'APPLY_JOB',
                choice.id, resource.data.version, () => navigate({ page: 'income' }));
            }}
          >
            {mode === 'raise' ? 'Попросить повышение' : mode === 'side-jobs' ? 'Откликнуться' : 'Устроиться'}
          </BudgetButton>
          <BudgetButton variant="outline" onClick={() => navigate({ page: 'income' })}>Назад к доходам</BudgetButton>
        </>
      )}
    </>
  );
}
