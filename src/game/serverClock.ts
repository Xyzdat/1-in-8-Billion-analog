import type { Session } from '../api/sessionTypes';

// Purchases change the version, but do not start a new game year.
export function getServerClockKey(session: Session) {
  return `${session.state.age}:${session.state.pendingDecision?.id ?? ''}`;
}
