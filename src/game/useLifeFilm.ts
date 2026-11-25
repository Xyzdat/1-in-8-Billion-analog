import { useEffect, useRef, useState } from 'react';
import type { Session } from '../api/sessionTypes';
import { createLifeFilmClock, finalLifeSlides, restoreLifeFilmPosition } from './lifeFilm';
import type { LifeFilmSnapshot } from './lifeFilm';

export function useLifeFilm(session: Session, automatic: boolean, onFinish: () => void) {
  const slides = finalLifeSlides(session);
  const storageKey = `life.film.${session.id}`;
  const [initial] = useState(() => {
    let saved: string | null = null;
    try {
      if (automatic && typeof window !== 'undefined') saved = window.localStorage.getItem(storageKey);
    } catch {
      // Просмотр работает и без доступа к хранилищу браузера.
    }
    return restoreLifeFilmPosition(slides, saved, automatic);
  });
  const [view, setView] = useState<LifeFilmSnapshot>({
    position: initial,
    index: slides.findIndex((slide) => slide.id === initial.slideId),
    token: 0,
    paused: false,
  });
  const clockRef = useRef<ReturnType<typeof createLifeFilmClock> | null>(null);
  const finishRef = useRef(onFinish);
  const slideIds = JSON.stringify(slides.map((slide) => slide.id));

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const clock = createLifeFilmClock(JSON.parse(slideIds), initial, {
      now: () => performance.now(),
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      clear: (handle) => window.clearTimeout(handle),
    }, (snapshot) => {
      setView(snapshot);
      if (automatic) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(snapshot.position));
        } catch {
          // Не прерываем фильм, если хранилище заполнено или недоступно.
        }
      }
    }, () => finishRef.current());
    clockRef.current = clock;
    const visibility = () => document.hidden ? clock.pause() : clock.resume();
    clock.start();
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clock.dispose();
      clockRef.current = null;
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [slideIds, initial, automatic, storageKey]);

  return {
    ...view,
    slides,
    skip: () => clockRef.current?.next(view.token),
  };
}
