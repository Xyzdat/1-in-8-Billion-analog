import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { YEAR_MS } from './simulation';
import type { ServerLife } from './useServerLife';
import type { Session } from '../api/sessionTypes';
import { getServerClockKey } from './serverClock';

export function useServerClock(session: Session, server: ServerLife, externalBlocked = false) {
  const { age, status, pendingDecision } = session.state;
  const key = getServerClockKey(session);
  const [speed, changeSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);
  const [clock, setClock] = useState({ key, milliseconds: 0, playedMs: 0 });
  const elapsed = useRef({ key, milliseconds: 0, playedMs: 0 });
  const attemptedDecision = useRef<number | null>(null);
  const complete = status === 'COMPLETE';
  const blocked = server.busy || Boolean(server.failure) || externalBlocked;
  const advance = useEffectEvent(() => server.advance());
  const answer = useEffectEvent((id: string) => server.answer(id));

  useEffect(() => {
    if (elapsed.current.key !== key) {
      elapsed.current = { key, milliseconds: 0, playedMs: elapsed.current.playedMs };
    }
    if (paused || complete || blocked || pendingDecision) {
      return;
    }
    let lastUpdate = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const milliseconds = Math.min(YEAR_MS, elapsed.current.milliseconds + (now - lastUpdate) * speed);
      const playedMs = elapsed.current.playedMs + milliseconds - elapsed.current.milliseconds;
      lastUpdate = now;
      elapsed.current = { key, milliseconds, playedMs };
      setClock(elapsed.current);

      if (milliseconds === YEAR_MS) {
        window.clearInterval(timer);
        advance();
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [key, speed, paused, complete, blocked, pendingDecision]);

  useEffect(() => {
    const option = pendingDecision?.options[0];
    if (auto && option && !complete && !blocked && attemptedDecision.current !== session.version) {
      attemptedDecision.current = session.version;
      answer(option.id);
    }
  }, [auto, complete, blocked, pendingDecision, session.version]);

  return {
    age,
    complete,
    progress: complete ? 1 : clock.key === key ? clock.milliseconds / YEAR_MS : 0,
    playedMs: clock.playedMs,
    speed,
    changeSpeed,
    paused,
    togglePause: () => setPaused((value) => !value),
    auto,
    toggleAuto: () => setAuto((value) => !value),
  };
}
