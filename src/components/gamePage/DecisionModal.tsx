import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Decision } from '../../mocks/gameChoices';
import { personLabels } from '../../mocks/lifeEconomy';
import type { PersonId } from '../../mocks/lifeEconomy';
import type { DecisionStatEffects } from '../../api/sessionTypes';
import DecisionEffects from './DecisionEffects';
import DecisionHeading from './DecisionHeading';
import styles from './GamePage.module.scss';

type Props = {
  decision: Pick<Decision, 'title' | 'important'> & {
    text?: string;
    options: (Pick<Decision['options'][number], 'title' | 'money' | 'career'> & {
      id?: string;
      description?: string;
      changes?: DecisionStatEffects;
      aura?: number | null;
      closeness?: Record<string, number>;
    })[];
  };
  peopleLabels?: Record<string, string>;
  age: number;
  year: number;
  onChoose: (index: number) => void;
  onAuto: () => void;
  auto?: boolean;
  autoSeconds?: number | null;
  onDefer?: () => void;
  busy?: boolean;
  failure?: { message: string; retry?: () => void; recoverable?: boolean } | null;
};

export default function DecisionModal({ decision, peopleLabels, age, year, onChoose, onAuto, auto = false, autoSeconds, onDefer, busy, failure }: Props) {
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
      onCancel={(event) => {
        event.preventDefault();
        if (auto && !busy && !failure) onAuto();
      }}
    >
      <div className={styles.game__decisionContent}>
        <DecisionHeading
          title={decision.title}
          text={decision.text}
          important={decision.important}
          age={age}
          year={year}
          onDefer={onDefer}
        />

        {decision.options.map((option, index) => (
          <button
            className={styles.game__decisionOption}
            type="button"
            key={option.id ?? option.title}
            onClick={() => onChoose(index)}
            disabled={busy || Boolean(failure && !failure.recoverable)}
          >
            <span className={styles.game__decisionNumber}>{index + 1}</span>
            <span>
              <strong>{option.title}</strong>
              {option.description && (
                <span className={styles.game__consequences}>{option.description}</span>
              )}
              <DecisionEffects effects={option.changes} aura={option.aura} />
              <span className={styles.game__consequences}>
                {Object.entries(option.closeness ?? {}).filter(([, value]) => value !== 0).map(([person, value]) => {
                  const name = peopleLabels
                    ? peopleLabels[person] ?? 'Близкий'
                    : personLabels[person as PersonId] ?? 'Близкий';
                  return (
                    <span key={person} title={`${name}: близость ${value > 0 ? '+' : ''}${value}`}>
                      {name}: близость {value > 0 ? '↑' : '↓'}
                    </span>
                  );
                })}
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

        {/* {busy && <p role="status">Сохраняем решение…</p>} */}
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
        {auto && autoSeconds != null && !busy && !failure && (
          <p className={styles.game__muted} role="status" aria-live="polite">
            Автовыбор первого варианта через {autoSeconds} с
          </p>
        )}
        <button
          type="button"
          className={styles.game__autoChoice}
          onClick={onAuto}
          disabled={busy || Boolean(failure)}
        >
          {auto ? 'Отменить «Автовыбор»' : 'Включить «Автовыбор»'}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
