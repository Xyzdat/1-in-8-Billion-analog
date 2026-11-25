import { useState } from 'react';
import { completedLifeSummary } from '../../game/completedLives';
import { useCompletedLife } from '../../game/useCompletedLife';
import LifeCards from '../lifeCards/LifeCards';
import LifeRecord from './LifeRecord';
import LifeSlideshow from '../lifeSlideshow/LifeSlideshow';
import { finalLifeSlides } from '../../game/lifeFilm';
import heroImage from '../../assets/completed-life-hero.png';
import starIcon from '../../assets/completed-life-star.svg';
import styles from './CompletedLifePage.module.scss';

type Props = {
  id: string;
  onStart: () => void;
  onHome: () => void;
};

function LifeResults({ summary }: { summary: ReturnType<typeof completedLifeSummary> }) {
  return (
    <section
      className={styles.completedLife__results}
      aria-labelledby="life-results-title"
    >
      <h2 id="life-results-title">Итоги жизни</h2>
      <dl className={styles.completedLife__facts}>
        {[
          ['Семья', summary.family],
          ['Дом', summary.home],
          ['Дело жизни', summary.occupation],
        ].map(([label, value]) => (
          <div className={styles.completedLife__fact} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.completedLife__aura}>
        <span className={styles.completedLife__auraIcon} aria-hidden="true">
          ⚖️
        </span>
        <div className={styles.completedLife__auraText}>
          <h3>Аура</h3>
          <p>{summary.auraText}</p>
        </div>
        <strong>{summary.aura}</strong>
      </div>
    </section>
  );
}

export default function CompletedLifePage({ id, onStart, onHome }: Props) {
  const { session, finances, error, financeError, loading, retry } = useCompletedLife(id);
  const [record, setRecord] = useState<'film' | 'memories' | null>(null);
  const [notice, setNotice] = useState('');
  const summary = session ? completedLifeSummary(session, finances) : null;

  return (
    <main className={styles.completedLife}>
      <div className={styles.completedLife__hero}>
        <img src={heroImage} alt="Иллюстрация памяти о прожитой жизни" />
      </div>
      <div className={styles.completedLife__content}>
        {loading && (
          <p role="status">Загружаем прожитую жизнь…</p>
        )}
        {error && (
          <section className={styles.completedLife__results}>
            <p role="alert">{error}</p>
            <button
              className={styles.completedLife__secondary}
              type="button"
              onClick={retry}
            >
              Повторить загрузку
            </button>
            <button
              className={styles.completedLife__secondary}
              type="button"
              onClick={onHome}
            >
              На главную
            </button>
          </section>
        )}
        {session && summary && (
          <>
            <header className={styles.completedLife__heading}>
              <h1>Твоя жизнь завершилась</h1>
              <p className={styles.completedLife__years}>{summary.years}</p>
              <p className={styles.completedLife__name}>
                {summary.name} · {summary.age}
              </p>
              <p className={styles.completedLife__birthplace}>
                {summary.birthplace}
              </p>
            </header>
            <LifeResults summary={summary} />
            {financeError && (
              <p className={styles.completedLife__muted} role="status">
                Сведения о месте проживания пока недоступны.{' '}
                <button type="button" onClick={retry}>
                  Обновить данные
                </button>
              </p>
            )}
            <button
              type="button"
              className={styles.completedLife__primary}
              onClick={() => setRecord('film')}
            >
              Посмотреть фильм о жизни
            </button>
            <button
              type="button"
              className={styles.completedLife__memories}
              onClick={() => setRecord('memories')}
            >
              <img src={starIcon} alt="" />
              Посмотреть памятные моменты
            </button>
            <LifeCards />
            <button
              type="button"
              className={styles.completedLife__companion}
              onClick={() => setNotice('Поиск собеседника пока недоступен.')}
            >
              Найти собеседника
            </button>
            {notice && (
              <p className={styles.completedLife__muted} role="status">
                {notice}
              </p>
            )}
            <button
              type="button"
              className={styles.completedLife__secondary}
              onClick={onStart}
            >
              Играть дальше
            </button>
          </>
        )}
      </div>
      {session && record === 'film' && finalLifeSlides(session).length > 0 ? (
        <LifeSlideshow
          key={session.id}
          session={session}
          finances={finances}
          onFinish={() => setRecord(null)}
        />
      ) : session && record && (
        <LifeRecord
          session={session}
          mode={record}
          onClose={() => setRecord(null)}
        />
      )}
    </main>
  );
}
