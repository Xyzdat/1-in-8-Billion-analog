import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Finances } from '../../api/financeTypes';
import type { Session } from '../../api/sessionTypes';
import { useLifeFilm } from '../../game/useLifeFilm';
import DeathIntro from './DeathIntro';
import HighlightSlide from './HighlightSlide';
import styles from './LifeSlideshow.module.scss';

type Props = {
  session: Session;
  finances?: Finances | null;
  automatic?: boolean;
  onFinish: () => void;
};

export default function LifeSlideshow({ session, finances, automatic = false, onFinish }: Props) {
  const film = useLifeFilm(session, automatic, onFinish);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  if (film.position.phase === 'done' || typeof document === 'undefined') return null;
  const slide = film.slides[film.index];

  return createPortal(
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-label="Важные моменты прожитой жизни"
      className={`${styles.lifeFilm} ${automatic ? styles['lifeFilm--entering'] : ''} ${film.paused ? styles['lifeFilm--paused'] : ''}`}
      onCancel={(event) => {
        event.preventDefault();
        film.skip();
      }}
    >
      <div className={styles.lifeFilm__veil} aria-hidden="true" />
      <div className={styles.lifeFilm__screen}>
        <div className={styles.lifeFilm__content}>
          {film.position.phase === 'intro' ? (
            <DeathIntro session={session} finances={finances} />
          ) : slide && (
            <>
              <HighlightSlide key={slide.id} slide={slide} />
              <div
                className={styles.lifeFilm__progress}
                role="progressbar"
                aria-label="Просмотр важных моментов"
                aria-valuemin={0}
                aria-valuemax={film.slides.length}
                aria-valuenow={film.index + 1}
              >
                {film.slides.map((item, index) => (
                  <span
                    key={item.id}
                    className={[
                      styles.lifeFilm__segment,
                      index < film.index ? styles['lifeFilm__segment--complete'] : '',
                      index === film.index ? styles['lifeFilm__segment--current'] : '',
                    ].join(' ')}
                  />
                ))}
              </div>
              <p className={styles.lifeFilm__counter} aria-live="polite" aria-atomic="true">
                {film.index + 1} из {film.slides.length}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          className={styles.lifeFilm__skip}
          onClick={film.skip}
          aria-label={film.position.phase === 'intro' ? 'Пропустить вступление' : 'Пропустить текущий слайд'}
        >
          Пропустить
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
