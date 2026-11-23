import type { SessionHistoryEvent } from '../api/sessionTypes.ts';

const YEAR_DURATION_MS = 60_000;

export type HistoryPlayback = {
  version: number;
  history: SessionHistoryEvent[];
  revealAt: Map<string, number>;
};

export function createHistoryPlayback(version: number, history: SessionHistoryEvent[]): HistoryPlayback {
  // При открытии сохранения уже прожитая история доступна целиком.
  return { version, history, revealAt: new Map() };
}

export function updateHistoryPlayback(
  previous: HistoryPlayback,
  version: number,
  history: SessionHistoryEvent[],
  playedMs: number,
  showImmediately: boolean,
): HistoryPlayback {
  if (showImmediately) {
    return createHistoryPlayback(version, history);
  }

  const knownIds = new Set(previous.history.map((event) => event.id));
  const currentIds = new Set(history.map((event) => event.id));
  const revealAt = new Map([...previous.revealAt].filter(([id]) => currentIds.has(id)));
  const additions = history.filter((event) => !knownIds.has(event.id));
  const pendingTimes = [...revealAt.values()].filter((time) => time > playedMs);
  const startAt = Math.max(playedMs, ...pendingTimes);

  // API сообщает только целый возраст. Интервалы относятся к показу записей,
  // исходные даты и текст событий сохраняются.
  const interval = YEAR_DURATION_MS / (additions.length + 1);
  additions.forEach((event, index) => {
    revealAt.set(event.id, startAt + interval * (index + 1));
  });

  return { version, history, revealAt };
}

export function visibleHistory(playback: HistoryPlayback, playedMs: number) {
  return playback.history.filter((event) => (playback.revealAt.get(event.id) ?? 0) <= playedMs);
}
