import { useEffect, useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { birthAnimation, character } from '../../mocks/mockData';
import styles from './bearthPage.module.scss';

type BirthplacePageProps = {
  onComplete: () => void;
};

function BirthplacePage({ onComplete }: BirthplacePageProps) {
  const [step, setStep] = useState(0);
  const [settled, setSettled] = useState(false);

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
        setSettled(true);
        timer = setTimeout(onComplete, birthAnimation.resultDuration);
      }
    };

    if (motion.matches) {
      setSettled(true);
      timer = setTimeout(onComplete, birthAnimation.reducedMotionDuration);
    } else {
      timer = setTimeout(advance, birthAnimation.steps[0].duration);
    }

    return () => clearTimeout(timer);
  }, [onComplete]);

  const current = settled ? character : birthAnimation.steps[step];

  return (
    <main
      className={`${styles.birthplace}${settled ? ` ${styles['birthplace--settled']}` : ''}`}
      aria-busy={!settled}
    >
      <div className={styles.birthplace__content}>
        <p className={styles.birthplace__label}>ОПРЕДЕЛЯЕТСЯ МЕСТО РОЖДЕНИЯ</p>
        <div className={styles.birthplace__selection} key={settled ? 'result' : step} aria-hidden="true">
          <div className={styles.birthplace__flag}>
            <ReactCountryFlag countryCode={current.countryCode} svg />
          </div>
          <h1 className={styles.birthplace__country}>{current.country}</h1>
        </div>
        <div className={styles.birthplace__chance} aria-hidden={!settled}>
          <span>Шанс родиться:</span>
          <strong>{settled ? character.birthChance : '…'}</strong>
        </div>
        <p className={styles.birthplace__status} role="status" aria-live="polite">
          {settled ? `Место рождения: ${character.country}. Шанс родиться: ${character.birthChance}` : 'Выбираем страну рождения…'}
        </p>
      </div>
    </main>
  );
}

export default BirthplacePage;
