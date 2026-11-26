import { useState } from 'react';
import type { Session } from '../api/sessionTypes';
import { createHistoryPlayback, updateSessionHistory, visibleHistory } from './historyPlayback';

export function useServerHistory(session: Session, playedMs: number) {
  const [playback, setPlayback] = useState(() =>
    createHistoryPlayback(session.version, session.state.history));
  let current = playback;

  if (playback.version !== session.version || playback.history !== session.state.history) {
    current = updateSessionHistory(playback, session, playedMs);
    // GET может пересмотреть важность старых событий без смены версии сессии.
    setPlayback(current);
  }

  return visibleHistory(current, playedMs);
}
