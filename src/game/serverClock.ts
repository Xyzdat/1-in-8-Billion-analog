import type { Session } from '../api/sessionTypes.ts';
import { YEAR_MS } from './simulation.ts';

// Only confirmed game time starts a new interval; decisions and purchases do not.
export function getServerClockKey(session: Session) {
  return session.simulation
    ? `${session.id}:month:${session.simulation.elapsedMonths}`
    : `${session.id}:year:${session.state.age}`;
}

export function getServerClockFrame(session: Session) {
  return {
    key: getServerClockKey(session),
    durationMs: session.simulation ? YEAR_MS * session.simulation.stepMonths / 12 : YEAR_MS,
    baseProgress: session.simulation ? session.simulation.monthOfYear / 12 : 0,
    completeProgress: session.simulation?.death ? (session.simulation.death.elapsedMonths % 12) / 12 : 1,
  };
}

export type ServerClockState = { key: string; milliseconds: number; playedMs: number };
type Frame = ReturnType<typeof getServerClockFrame>;

export function advanceServerClock(
  clock: ServerClockState,
  frame: Pick<Frame, 'key' | 'durationMs'>,
  realDeltaMs: number,
  speed: number,
  blocked: boolean,
): ServerClockState {
  const previous = clock.key === frame.key ? clock.milliseconds : 0;
  const milliseconds = blocked
    ? previous
    : Math.min(frame.durationMs, previous + Math.max(0, realDeltaMs) * speed);
  return {
    key: frame.key,
    milliseconds,
    playedMs: clock.playedMs + milliseconds - previous,
  };
}

export function getServerYearProgress(clock: ServerClockState, frame: Frame, complete = false) {
  if (complete) return frame.completeProgress;
  return Math.min(1, frame.baseProgress + (clock.key === frame.key ? clock.milliseconds : 0) / YEAR_MS);
}
