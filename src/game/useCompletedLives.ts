import { useEffect, useState } from 'react';
import { sessionsApi } from '../api';
import { loadCompletedLives } from './completedLives';
import type { CompletedLifeEntry } from './completedLives';

export function useCompletedLives() {
  const [entries, setEntries] = useState<CompletedLifeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void loadCompletedLives(sessionsApi, controller.signal, (list) => {
      if (!controller.signal.aborted) setEntries(list);
    }).then((list) => {
      if (!controller.signal.aborted) setEntries(list);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Не удалось загрузить ваши прожитые жизни.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  return { entries, loading, error, retry: () => setAttempt((value) => value + 1) };
}
