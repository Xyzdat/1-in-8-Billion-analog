import { useCallback, useEffect, useState } from 'react';
import styles from './RollingNumber.module.scss';

type Props = {
  value: number;
};

export default function RollingNumber({ value }: Props) {
  const [displayed, setDisplayed] = useState(value);
  const [incoming, setIncoming] = useState<number | null>(null);

  useEffect(() => {
    if (incoming !== null || displayed === value) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(value);
      return;
    }
    setIncoming(value);
  }, [displayed, incoming, value]);

  const finish = useCallback(() => {
    if (incoming === null) return;
    setDisplayed(incoming);
    setIncoming(null);
  }, [incoming]);

  useEffect(() => {
    if (incoming === null) return;
    // Подстраховка на случай, если браузер не отправит animationend.
    const timer = window.setTimeout(finish, 450);
    return () => window.clearTimeout(timer);
  }, [incoming, finish]);

  return (
    <strong className={styles.rollingNumber}>
      <span className={styles.rollingNumber__accessible}>{value}</span>
      <span
        className={[
          styles.rollingNumber__track,
          incoming !== null ? styles['rollingNumber__track--moving'] : '',
        ].join(' ')}
        aria-hidden="true"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) finish();
        }}
      >
        <span className={styles.rollingNumber__value}>{displayed}</span>
        {incoming !== null && (
          <span className={styles.rollingNumber__value}>{incoming}</span>
        )}
      </span>
    </strong>
  );
}
