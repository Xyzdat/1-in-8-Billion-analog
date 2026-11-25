import { useEffect, useEffectEvent, useState } from 'react';
import type { Session } from '../api/sessionTypes';
import type { ServerLife } from './useServerLife';

type Result<T> = {
  identity: string;
  data: T | null;
  loading: boolean;
  error: string;
};

export function useSessionResource<T extends { version: number }>(
  session: Session,
  server: ServerLife,
  resource: string,
  load: (signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  const identity = `${session.id}:${resource}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T>>({ identity, data: null, loading: true, error: '' });
  const loadLatest = useEffectEvent(load);
  const refreshSession = useEffectEvent(() => server.refresh());

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setResult((previous) => ({
      identity,
      data: previous.identity === identity ? previous.data : null,
      loading: true,
      error: '',
    }));
    void loadLatest(controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        setResult({ identity, data, loading: false, error: '' });
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setResult((previous) => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error.message : 'Не удалось загрузить данные.',
        }));
      }
    });
    return () => controller.abort();
  }, [identity, session.version, server.resourceRevision, attempt, enabled]);

  const data = result.identity === identity ? result.data : null;
  const resourceVersion = data?.version;
  useEffect(() => {
    if (resourceVersion !== undefined && resourceVersion > session.version && !server.busy && !server.failure) {
      refreshSession();
    }
  }, [resourceVersion, session.version, server.busy, server.failure]);

  return {
    data,
    loading: result.identity !== identity || result.loading,
    error: result.identity === identity ? result.error : '',
    retry: () => setAttempt((previous) => previous + 1),
  };
}
