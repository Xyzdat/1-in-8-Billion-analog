import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Decision } from '../../mocks/gameChoices';
import { personLabels } from '../../mocks/lifeEconomy';
import type { PersonId } from '../../mocks/lifeEconomy';
import { Consequences } from './YearFocus';
import styles from './GamePage.module.scss';

type Props = {
  decision: Pick<Decision, 'title' | 'important'> & {
    text?: string;
    options: (Pick<Decision['options'][number], 'title' | 'closeness' | 'money' | 'career'> & {
      id?: string;
      changes?: Decision['options'][number]['changes'];
    })[];
  };
  age: number;
  year: number;
  onChoose: (index: number) => void;
  onAuto: () => void;
  onDefer?: () => void;
  busy?: boolean;
  failure?: { message: string; retry?: () => void } | null;
};

export default function DecisionModal({ decision, age, year, onChoose, onAuto, onDefer, busy, failure }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const restoreFrame = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (restoreFrame.current !== null) {
      window.cancelAnimationFrame(restoreFrame.current);
      restoreFrame.current = null;
    }
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const scrollLeft = window.scrollX;
    const scrollTop = window.scrollY;

    const restoreScroll = () => {
      window.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'instant' });
    };

    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    restoreScroll();

    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) {
        previous.focus({ preventScroll: true });
      }
      restoreScroll();
      // Повторяем после обновления летописи и нативного восстановления фокуса dialog.
      restoreFrame.current = window.requestAnimationFrame(() => {
        restoreScroll();
        restoreFrame.current = null;
      });
    };
  }, []);

  return createPortal(
    <dialog
      ref={ref}
      className={styles.game__decision}
      aria-labelledby="decision-title"
      aria-describedby={decision.text ? 'decision-text' : undefined}
      onCancel={(event) => event.preventDefault()}
    >
      <div className={styles.game__decisionContent}>
        {decision.important && (
          <div className={styles.game__decisionHeading}>
            <span className={styles.game__important}>Важное решение</span>
            {onDefer && <button type="button" onClick={onDefer}>Отложить на время</button>}
          </div>
        )}
        <p className={styles.game__muted}>
          {age} {age === 1 ? 'год' : age >= 2 && age <= 4 ? 'года' : 'лет'} · {year}
        </p>
        <h2 id="decision-title">{decision.title}</h2>
        {decision.text && <p id="decision-text">{decision.text}</p>}

        {decision.options.map((option, index) => (
          <button
            className={styles.game__decisionOption}
            type="button"
            key={option.id ?? option.title}
            onClick={() => onChoose(index)}
            disabled={busy || Boolean(failure)}
          >
            <span className={styles.game__decisionNumber}>{index + 1}</span>
            <span>
              <strong>{option.title}</strong>
              {option.changes && <Consequences changes={option.changes} />}
              <span className={styles.game__consequences}>
                {(Object.keys(option.closeness || {}) as PersonId[]).map((person) => (
                  <span key={person}>
                    {personLabels[person]} {Number(option.closeness?.[person]) > 0 ? '↑' : '↓'}
                  </span>
                ))}
                {option.money?.income ? (
                  <span>Доход +{option.money.income.toLocaleString('ru-RU')} ₽</span>
                ) : null}
                {option.money?.expenses ? (
                  <span>Расход −{option.money.expenses.toLocaleString('ru-RU')} ₽</span>
                ) : null}
                {option.career && (
                  <span>Меняет постоянные доходы и расходы</span>
                )}
              </span>
            </span>
          </button>
        ))}

        {busy && <p role="status">Сохраняем решение…</p>}
        {failure && (
          <div>
            <p role="alert">{failure.message}</p>
            {failure.retry && (
              <button type="button" className={styles.game__autoChoice} onClick={failure.retry}>
                Повторить
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          className={styles.game__autoChoice}
          onClick={onAuto}
          disabled={busy || Boolean(failure)}
        >
          Включить «Автовыбор»
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
