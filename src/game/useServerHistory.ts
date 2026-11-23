import { useState } from 'react';
import type { Session } from '../api/sessionTypes';
import { createHistoryPlayback, updateHistoryPlayback, visibleHistory } from './historyPlayback';

export function useServerHistory(session: Session, playedMs: number) {
  const [playback, setPlayback] = useState(() =>
    createHistoryPlayback(session.version, session.state.history));
  let current = playback;

  if (playback.version !== session.version) {
    current = updateHistoryPlayback(
      playback,
      session.version,
      session.state.history,
      playedMs,
      session.state.status === 'COMPLETE' || Boolean(session.state.pendingDecision),
    );
    // Обновляем буфер при новом снимке до отображения, исключая вспышку всей пачки.
    setPlayback(current);
  }

  return visibleHistory(current, playedMs);
}
