import { useEffect, useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { birthAnimation, character } from '../../mocks/mockData';
import styles from './bearthPage.module.scss';

type BirthplacePageProps = {
  onComplete: () => void;
  result?: { country: string; countryCode: string; birthChance?: string } | null;
  failure?: { message: string; retry?: () => void } | null;
  busy?: boolean;
  onMockStart?: () => void;
};

function BirthplacePage({
  onComplete,
  result = character,
  failure = null,
  busy = false,
  onMockStart,
}: BirthplacePageProps) {
  const [step, setStep] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);
  const settled = animationDone && Boolean(result) && !failure;

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout>;
    let index = 0;

    const advance = () => {
      index += 1;

      if (index < birthAnimation.steps.length) {
        setStep(index);
        timer = setTimeout(advance, birthAnimation.steps[index].duration);
      } else {
        setAnimationDone(true);
        index = 0;
        setStep(index);
        timer = setTimeout(advance, birthAnimation.steps[index].duration);
      }
    };

    if (motion.matches) {
      setAnimationDone(true);
    } else {
      timer = setTimeout(advance, birthAnimation.steps[0].duration);
    }

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settled) {
      return;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      onComplete,
      reducedMotion ? birthAnimation.reducedMotionDuration : birthAnimation.resultDuration,
    );
    return () => window.clearTimeout(timer);
  }, [settled, onComplete]);

  const current = settled && result ? result : birthAnimation.steps[step];

  return (
    <main
      className={`${styles.birthplace}${settled ? ` ${styles['birthplace--settled']}` : ''}`}
      aria-busy={!settled && !failure}
    >
      <div className={styles.birthplace__content}>
        <p className={styles.birthplace__label}>ОПРЕДЕЛЯЕТСЯ МЕСТО РОЖДЕНИЯ</p>
        <div className={styles.birthplace__selection} key={settled ? 'result' : step} aria-hidden="true">
          <div className={styles.birthplace__flag}>
            <ReactCountryFlag countryCode={current.countryCode} svg />
          </div>
          <h1 className={styles.birthplace__country}>{current.country}</h1>
        </div>
        {result?.birthChance && (
          <div className={styles.birthplace__chance} aria-hidden={!settled}>
            <span>Шанс родиться:</span>
            <strong>{settled ? result.birthChance : '…'}</strong>
          </div>
        )}
        <p className={styles.birthplace__status} role="status" aria-live="polite">
          {settled && result ? `Место рождения: ${result.country}.` : 'Выбираем страну рождения…'}
        </p>
        {failure && (
          <div className={styles.birthplace__error}>
            <p role="alert">{failure.message}</p>
            {failure.retry && (
              <button type="button" onClick={failure.retry} disabled={busy}>
                Повторить
              </button>
            )}
            {onMockStart && (
              <button type="button" onClick={onMockStart} disabled={busy}>
                Играть с моковыми данными
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default BirthplacePage;
