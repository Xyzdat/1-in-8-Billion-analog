import { useState } from 'react';
import type { Session } from '../api/sessionTypes';
import { createHistoryPlayback, updateSessionHistory, visibleHistory } from './historyPlayback';

export function useServerHistory(session: Session, playedMs: number) {
  const [playback, setPlayback] = useState(() =>
    createHistoryPlayback(session.version, session.state.history));
  let current = playback;

  if (playback.version !== session.version) {
    current = updateSessionHistory(playback, session, playedMs);
    // Обновляем буфер при новом снимке до отображения, исключая вспышку всей пачки.
    setPlayback(current);
  }

  return visibleHistory(current, playedMs);
}
