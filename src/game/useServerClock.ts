import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ServerLife } from './useServerLife';
import type { Session } from '../api/sessionTypes';
import { advanceServerClock, getServerClockFrame, getServerYearProgress } from './serverClock';
import { useAutoDecision } from './useAutoDecision';

export function useServerClock(session: Session, server: ServerLife, externalBlocked = false) {
  const { age, status, pendingDecision } = session.state;
  const frame = getServerClockFrame(session);
  const { key, durationMs } = frame;
  const [speed, changeSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);
  const [clock, setClock] = useState({ key, milliseconds: 0, playedMs: 0 });
  const elapsed = useRef({ key, milliseconds: 0, playedMs: 0 });
  const complete = status === 'COMPLETE';
  const blocked = server.busy || Boolean(server.failure) || externalBlocked;
  const advance = useEffectEvent(() => server.advance());
  const autoDecision = useAutoDecision({
    enabled: auto,
    decisionKey: pendingDecision ? `${session.id}:${pendingDecision.id}` : null,
    blocked: blocked || paused || complete || server.decisionReviewRequired,
    onChoose: () => {
      const option = pendingDecision?.options[0];
      if (option) server.answer(option.id);
    },
  });

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
      elapsed.current = advanceServerClock(
        elapsed.current,
        { key, durationMs },
        now - lastUpdate,
        speed,
        false,
      );
      lastUpdate = now;
      setClock(elapsed.current);

      if (elapsed.current.milliseconds === durationMs) {
        window.clearInterval(timer);
        advance();
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [key, durationMs, speed, paused, complete, blocked, pendingDecision]);

  return {
    age,
    complete,
    progress: getServerYearProgress(clock, frame, complete),
    playedMs: clock.playedMs,
    speed,
    changeSpeed,
    paused,
    togglePause: () => setPaused((value) => !value),
    auto,
    autoSeconds: autoDecision.seconds,
    cancelAutoDecision: autoDecision.cancel,
    toggleAuto: () => {
      autoDecision.cancel();
      setAuto((value) => !value);
    },
  };
}
