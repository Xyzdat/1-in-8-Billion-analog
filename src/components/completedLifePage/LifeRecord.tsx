import { useEffect, useState } from 'react';
import type { Session } from '../../api/sessionTypes';
import { ageText } from '../../game/completedLives';
import { useLifeFavorites } from '../../game/useLifeFavorites';
import { LIFE_SLIDE_MS } from '../../game/lifeFilm';
import SpendingDialog from '../gamePage/SpendingDialog';
import styles from './CompletedLifePage.module.scss';

type Props = {
  session: Session;
  mode: 'film' | 'memories';
  onClose: () => void;
};

const noBlock = () => {};

export default function LifeRecord({ session, mode, onClose }: Props) {
  const { favorites, toggleFavorite } = useLifeFavorites(session.id);
  const events = mode === 'memories'
    ? session.state.history.filter((event) => favorites.includes(event.id))
    : session.highlights ? [] : session.state.history;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(mode === 'film');
  const current = events[Math.min(index, Math.max(0, events.length - 1))];

  useEffect(() => {
    if (!playing || mode !== 'film' || index >= events.length - 1) return;
    const timer = window.setTimeout(() => setIndex((value) => value + 1), LIFE_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [playing, mode, index, events.length]);

  function togglePlayback() {
    if (index >= events.length - 1) {
      setIndex(0);
      setPlaying(true);
    } else {
      setPlaying((value) => !value);
    }
  }

  return (
    <SpendingDialog
      title={mode === 'film' ? 'Фильм о жизни' : 'Памятные моменты'}
      onClose={onClose}
      onBlockTime={noBlock}
      closeLabel="Вернуться к итогам жизни"
    >
      <p className={styles.completedLife__muted}>
        {session.character.name} · {session.character.birthYear}
      </p>
      {!events.length && (
        <p role="status">
          {mode === 'memories'
            ? 'Памятные моменты пока не отмечены. Их можно выбрать звёздочкой в летописи.'
            : session.highlights
              ? 'Для этой жизни нет сохранённых важных моментов.'
              : 'Летопись этой жизни недоступна.'}
        </p>
      )}
      {mode === 'film' && current && (
        <>
          <article className={styles.completedLife__record}>
            <span>
              {ageText(current.age)} · {session.character.birthYear + current.age}
            </span>
            <h2>{current.title}</h2>
            <p>{current.text}</p>
            <button
              className={styles.completedLife__memoryAction}
              type="button"
              aria-pressed={favorites.includes(current.id)}
              onClick={() => toggleFavorite(current.id)}
            >
              {favorites.includes(current.id) ? '★ Убрать из памятных' : '☆ Запомнить момент'}
            </button>
          </article>
          <progress
            className={styles.completedLife__recordProgress}
            max={events.length}
            value={index + 1}
            aria-label="Просмотр жизни"
          />
          <div className={styles.completedLife__recordControls}>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
            >
              Назад
            </button>
            <button type="button" onClick={togglePlayback}>
              {playing && index < events.length - 1 ? 'Пауза' : 'Смотреть'}
            </button>
            <button
              type="button"
              disabled={index >= events.length - 1}
              onClick={() => setIndex((value) => Math.min(events.length - 1, value + 1))}
            >
              Далее
            </button>
          </div>
          <p className={styles.completedLife__muted}>
            {index + 1} из {events.length}
          </p>
        </>
      )}
      {mode === 'memories' && events.map((event) => (
        <article className={styles.completedLife__record} key={event.id}>
          <span>
            {ageText(event.age)} · {session.character.birthYear + event.age}
          </span>
          <h2>{event.title}</h2>
          <p>{event.text}</p>
          <button
            type="button"
            className={styles.completedLife__memoryAction}
            onClick={() => toggleFavorite(event.id)}
          >
            ★ Убрать из памятных
          </button>
        </article>
      ))}
    </SpendingDialog>
  );
}
