import { useState } from 'react';
import type { BudgetEmployment } from '../../../api/budgetTypes';
import { budgetActionBlockReason, budgetResourceReady, formatBudgetTenure } from '../../../game/budgetPresentation';
import { useBudgetResource } from '../../../game/useBudgetResource';
import type { BudgetViewProps } from './budgetUiTypes';
import { BudgetButton, BudgetCard, BudgetResourceStatus, BudgetRow, budgetMoney } from './BudgetPrimitives';
import BudgetQuitDialog from './BudgetQuitDialog';
import styles from './Budget.module.scss';

function EmploymentDetails({ job }: { job: BudgetEmployment }) {
  return (
    <>
      <div className={styles.budget__employment}>
        <span className={styles.budget__icon} aria-hidden="true">💼</span>
        <div>
          <strong>{job.title}</strong>
          <small>
            {[job.schedule, job.hoursPerWeek != null ? `${job.hoursPerWeek} ч. в неделю` : null].filter(Boolean).join(' · ')}
          </small>
        </div>
      </div>
      <div className={styles.budget__columns}>
        <div>
          <small>Базовая зарплата</small>
          <strong>{budgetMoney(job.basePay)} / месяц</strong>
        </div>
        <div>
          <small>Стаж на этом месте</small>
          <strong>{formatBudgetTenure(job.currentTenureMonths)}</strong>
        </div>
      </div>
      {job.expectedPay !== null && job.expectedPay !== job.basePay && (
        <p className={styles.budget__hint}>
          С учётом работоспособности: {budgetMoney(job.expectedPay)} / месяц.
        </p>
      )}
      <p className={styles.budget__hint}>
        Фактически за последние 12 месяцев: {budgetMoney(job.actualIncome)}
      </p>
    </>
  );
}

export default function BudgetIncomePage({ session, server, navigate, execute }: BudgetViewProps) {
  const income = useBudgetResource(session, server, 'income');
  const jobs = useBudgetResource(session, server, 'jobs');
  const sideJobs = useBudgetResource(session, server, 'side-jobs');
  const strategies = useBudgetResource(session, server, 'strategies');
  const [quit, setQuit] = useState<{ id: string; title: string; secondary: boolean; version: number } | null>(null);
  const data = income.data?.available ? income.data.data : null;
  const primary = data?.primary?.status === 'BUSINESS' ? null : data?.primary;
  const blocked = Boolean(budgetActionBlockReason(session)) || server.busy || Boolean(server.failure?.retry);
  const currentJobs = jobs.data?.data;
  const currentSideJobs = sideJobs.data?.data;
  const selectedStrategy = strategies.data?.data?.options.find((option) => option.id === data?.storage.selectedId);
  const quitResource = quit?.secondary ? sideJobs : jobs;
  const quitValid = quit !== null && budgetResourceReady(quitResource, session.version)
    && quit.version === session.version && quitResource.data?.data?.canQuit === true
    && quitResource.data.data.current?.id === quit.id;

  return (
    <>
      <BudgetResourceStatus resource={income} />
      {data && (
        <>
          <BudgetCard>
            <div className={styles.budget__hero}>
              <h2>Доходы за год</h2>
              <strong className={styles.budget__income}>{budgetMoney(data.total)}</strong>
              <p className={styles.budget__muted}>В среднем — {budgetMoney(data.monthlyAverage)} в месяц</p>
            </div>
          </BudgetCard>
          <BudgetCard title="Твоя работа">
            {primary ? (
              <>
                <EmploymentDetails job={primary} />
                <BudgetButton onClick={() => navigate({ page: 'raise' })}>
                  Попросить повышение
                </BudgetButton>
                <div className={styles.budget__actions}>
                  <BudgetButton variant="outline" onClick={() => navigate({ page: 'side-jobs' })}>
                    Вторая работа
                  </BudgetButton>
                  <BudgetButton
                    variant="danger"
                    disabled={blocked || !budgetResourceReady(jobs, session.version) || !currentJobs?.canQuit}
                    onClick={() => {
                      if (currentJobs?.current && jobs.data) {
                        setQuit({ ...currentJobs.current, secondary: false, version: jobs.data.version });
                      }
                    }}
                  >
                    Уволиться
                  </BudgetButton>
                </div>
                <BudgetResourceStatus resource={jobs} />
                {currentJobs?.quitReason && (
                  <p className={styles.budget__hint}>{currentJobs.quitReason}</p>
                )}
              </>
            ) : (
              <>
                <div className={styles.budget__employment}>
                  <span className={styles.budget__icon} aria-hidden="true">💼</span>
                  <strong>{data.business ? 'Ты занимаешься своим делом' : 'Нет основной работы'}</strong>
                </div>
                <BudgetButton onClick={() => navigate({ page: 'jobs' })}>Найти работу</BudgetButton>
                <BudgetButton variant="outline" onClick={() => navigate({ page: 'side-jobs' })}>
                  Вторая работа
                </BudgetButton>
              </>
            )}
          </BudgetCard>
          {data.secondary && (
            <BudgetCard title="Вторая работа">
              <EmploymentDetails job={data.secondary} />
              <BudgetButton
                variant="danger"
                disabled={blocked || !budgetResourceReady(sideJobs, session.version) || !currentSideJobs?.canQuit}
                onClick={() => {
                  if (currentSideJobs?.current && sideJobs.data) {
                    setQuit({ ...currentSideJobs.current, secondary: true, version: sideJobs.data.version });
                  }
                }}
              >
                Уволиться с подработки
              </BudgetButton>
              <BudgetResourceStatus resource={sideJobs} />
              {currentSideJobs?.quitReason && (
                <p className={styles.budget__hint}>{currentSideJobs.quitReason}</p>
              )}
            </BudgetCard>
          )}
          <BudgetCard title="Накопления">
            <p className={styles.budget__muted}>Здесь ты выбираешь, где хранить сбережения.</p>
            <div className={styles.budget__columns}>
              <div>
                <small>Тип</small>
                <strong>{selectedStrategy?.title ?? 'Нет данных о стратегии'}</strong>
              </div>
              <div>
                <small>Получено за 12 месяцев</small>
                <strong>{budgetMoney(data.storage.actualReturn)}</strong>
              </div>
            </div>
            <BudgetButton onClick={() => navigate({ page: 'strategies' })}>Сменить</BudgetButton>
          </BudgetCard>
          <BudgetCard title="Источники дохода">
            {data.sources.length === 0 && (
              <p className={styles.budget__muted}>За последние 12 месяцев поступлений не было.</p>
            )}
            <div>
              {data.sources.map((source) => (
                <BudgetRow key={source.id} label={source.title} value={budgetMoney(source.amount)} tone="income" />
              ))}
            </div>
          </BudgetCard>
          <BudgetCard title="Бизнес">
            {data.business ? (
              <>
                <strong>{data.business.title}</strong>
                {data.business.grossBreakdownKnown && (
                  <div>
                    <BudgetRow label="Выручка за 12 месяцев" value={budgetMoney(data.business.revenue)} tone="income" />
                    <BudgetRow label="Расходы за 12 месяцев" value={budgetMoney(data.business.costs)} tone="expense" />
                  </div>
                )}
                <BudgetRow label="Чистый результат за 12 месяцев" value={budgetMoney(data.business.net)} />
              </>
            ) : (
              <div className={styles.budget__employment}>
                <span className={styles.budget__icon} aria-hidden="true">🏪</span>
                <p>У тебя пока нет своего дела.</p>
              </div>
            )}
            <BudgetButton variant="outline" onClick={() => navigate({ page: 'businesses' })}>
              {data.business ? 'Посмотреть бизнес' : 'Открыть бизнес'}
            </BudgetButton>
          </BudgetCard>
        </>
      )}
      {quit && (
        <BudgetQuitDialog
          title={quit.title}
          busy={server.busy}
          failure={server.failure}
          disabled={blocked || !quitValid}
          onClose={() => setQuit(null)}
          onConfirm={() => execute(quit.secondary ? 'QUIT_SIDE_JOB' : 'QUIT_JOB', quit.id, quit.version, () => setQuit(null))}
        />
      )}
    </>
  );
}
