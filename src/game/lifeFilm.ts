import type { HighlightSlide, Session } from '../api/sessionTypes.ts';

export const LIFE_SLIDE_MS = 5000;
export const LIFE_INTRO_MS = 6200;

export type LifeFilmPosition = {
  phase: 'intro' | 'slide' | 'done';
  slideId: string | null;
};

export function finalLifeSlides(session: Session): HighlightSlide[] {
  return session.state.status === 'COMPLETE' && session.highlights?.status === 'FINAL'
    ? session.highlights.slides
    : [];
}

export function restoreLifeFilmPosition(
  slides: HighlightSlide[],
  saved: string | null,
  automatic: boolean,
): LifeFilmPosition {
  const beginning: LifeFilmPosition = automatic
    ? { phase: 'intro', slideId: null }
    : { phase: slides.length ? 'slide' : 'done', slideId: slides[0]?.id ?? null };
  if (!automatic || !saved) return beginning;
  try {
    const position: unknown = JSON.parse(saved);
    if (typeof position !== 'object' || position === null) return beginning;
    const { phase, slideId } = position as Record<string, unknown>;
    if (phase === 'done' || phase === 'intro') return { phase, slideId: null };
    if (phase === 'slide' && typeof slideId === 'string' && slides.some((slide) => slide.id === slideId)) {
      return { phase, slideId };
    }
  } catch {
    // Повреждённая локальная позиция не мешает открыть серверное сохранение.
  }
  return beginning;
}

export function lifeSlideParagraphs(slide: HighlightSlide) {
  const entries = slide.decisions.map((decision) => ({
    month: decision.month,
    paragraphs: [
      { id: `${decision.id}:choice`, text: decision.optionLabel, choice: true },
      { id: `${decision.id}:result`, text: decision.result, choice: false },
    ],
  }));
  for (const evidence of slide.evidence) {
    const repeatedResult = slide.decisions.some((decision) =>
      evidence.historyEventId === decision.historyEventId && evidence.text === decision.result);
    if (!repeatedResult) entries.push({
      month: evidence.month,
      paragraphs: [{ id: `evidence:${evidence.id}`, text: evidence.text, choice: false }],
    });
  }
  // Внутри объединённой главы чередуем выборы и подтверждения по времени.
  // Порядок самих слайдов по значимости здесь не пересчитывается.
  return entries.sort((a, b) => a.month - b.month)
    .flatMap((entry) => entry.paragraphs)
    .filter((paragraph) => paragraph.text.trim());
}

export function firstTwoSentences(text: string) {
  const sentences = new Intl.Segmenter('ru', { granularity: 'sentence' }).segment(text.trim());
  return Array.from(sentences, ({ segment }) => segment.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');
}

export function lifeSlideSummary(slide: HighlightSlide) {
  const description = lifeSlideParagraphs(slide)
    .filter((paragraph) => !paragraph.choice)
    .map((paragraph) => paragraph.text)
    .join(' ');
  return firstTwoSentences(description);
}

export type LifeFilmSnapshot = {
  position: LifeFilmPosition;
  index: number;
  token: number;
  paused: boolean;
};

type Scheduler = {
  now: () => number;
  schedule: (callback: () => void, delay: number) => number;
  clear: (handle: number) => void;
};

export function createLifeFilmClock(
  slideIds: string[],
  initial: LifeFilmPosition,
  scheduler: Scheduler,
  onChange: (snapshot: LifeFilmSnapshot) => void,
  onFinish: () => void,
) {
  let position = initial;
  let token = 0;
  let paused = false;
  let stopped = false;
  let started = false;
  let timer: number | undefined;
  let remaining = position.phase === 'intro' ? LIFE_INTRO_MS : LIFE_SLIDE_MS;
  let deadline = 0;
  const index = () => slideIds.indexOf(position.slideId ?? '');
  const snapshot = (): LifeFilmSnapshot => ({ position, index: index(), token, paused });
  const clear = () => {
    if (timer !== undefined) scheduler.clear(timer);
    timer = undefined;
  };

  function arm() {
    if (stopped || paused || position.phase === 'done') return;
    deadline = scheduler.now() + remaining;
    const expected = token;
    timer = scheduler.schedule(() => next(expected), remaining);
  }

  function next(expected: number) {
    if (stopped || !started || position.phase === 'done' || token !== expected) return;
    clear();
    const nextIndex = position.phase === 'intro' ? 0 : index() + 1;
    position = nextIndex < slideIds.length
      ? { phase: 'slide', slideId: slideIds[nextIndex] }
      : { phase: 'done', slideId: null };
    token += 1;
    remaining = LIFE_SLIDE_MS;
    onChange(snapshot());
    if (position.phase === 'done') onFinish();
    else arm();
  }

  return {
    snapshot,
    next,
    start() {
      if (started || stopped) return;
      started = true;
      onChange(snapshot());
      if (position.phase === 'done') onFinish();
      else arm();
    },
    pause() {
      if (paused || stopped || !started || position.phase === 'done') return;
      remaining = Math.max(0, deadline - scheduler.now());
      paused = true;
      clear();
      onChange(snapshot());
    },
    resume() {
      if (!paused || stopped || !started) return;
      paused = false;
      onChange(snapshot());
      arm();
    },
    dispose() {
      stopped = true;
      clear();
    },
  };
}
