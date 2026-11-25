import { useEffect, useState } from 'react';
import { sessionsApi } from '../api';
import type { Session } from '../api/sessionTypes';
import type { Finances } from '../api/financeTypes';

type Snapshot = {
  id: string;
  session: Session | null;
  finances: Finances | null;
  error: string;
  financeError: boolean;
  loading: boolean;
};

export function useCompletedLife(id: string) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ id, session: null, finances: null, error: '', financeError: false, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSnapshot({ id, session: null, finances: null, error: '', financeError: false, loading: true });
    void (async () => {
      try {
        const session = await sessionsApi.getSession(id, controller.signal);
        if (session.state.status !== 'COMPLETE') throw new Error('Эта жизнь ещё не завершена.');
        let finances: Finances | null = null;
        let financeError = false;
        try {
          finances = await sessionsApi.getFinances(id, controller.signal);
          if (finances.version !== session.version) {
            // Сводка и летопись должны относиться к одному серверному снимку.
            finances = null;
            financeError = true;
          }
        } catch {
          financeError = true;
        }
        if (!controller.signal.aborted) setSnapshot({ id, session, finances, financeError, error: '', loading: false });
      } catch (error) {
        if (!controller.signal.aborted) setSnapshot({
          id, session: null, finances: null, financeError: false, loading: false,
          error: error instanceof Error ? error.message : 'Не удалось загрузить прожитую жизнь.',
        });
      }
    })();
    return () => controller.abort();
  }, [id, attempt]);

  return {
    ...(snapshot.id === id ? snapshot : { id, session: null, finances: null, error: '', financeError: false, loading: true }),
    retry: () => setAttempt((value) => value + 1),
  };
}
