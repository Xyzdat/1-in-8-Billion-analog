import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { finalLifeSlides, lifeSlideParagraphs, restoreLifeFilmPosition } from '../src/game/lifeFilm.ts';
import { highlightsSession } from './fixtures/highlightsSession.mjs';

test('0.8.3 preserves FINAL, merged choices, evidence, score decreases, nulls, zero and incomplete history', () => {
  const session = highlightsSession();
  session.highlights.partialHistory = true;
  session.highlights.trackedFromMonth = 12;
  session.highlights.slides[0].decisions.push({
    ...session.highlights.slides[0].decisions[0], id: 'second-choice', optionLabel: 'Другой сохранённый ответ',
  });
  const before = structuredClone(session);
  assert.deepEqual(decodeSession(session), before);
  assert.deepEqual(finalLifeSlides(session).map((slide) => slide.age), [6, 18, 35]);
  assert.deepEqual(session, before, 'Presentation must not apply consequences or recompute importance');
  assert.equal(session.highlights.slides[0].decisions[0].balanceChange, 0);
});

test('absent/null highlights and event links remain compatible; LIVE and empty FINAL are not invented slides', () => {
  const session = highlightsSession();
  for (const provider of ['local', '1in8b']) {
    session.provider = provider;
    delete session.highlights;
    delete session.state.history[0].link;
    assert.equal(decodeSession(session).highlights, undefined);
    session.highlights = null;
    session.state.history[0].link = null;
    assert.equal(decodeSession(session).highlights, null);
    assert.deepEqual(finalLifeSlides(session), []);
  }
  session.highlights = highlightsSession().highlights;
  session.highlights.status = 'LIVE';
  session.highlights.finalizedAtMonth = null;
  assert.equal(decodeSession(session).highlights.status, 'LIVE');
  assert.deepEqual(finalLifeSlides(session), []);
  session.highlights.status = 'FINAL';
  session.highlights.slides = [];
  assert.deepEqual(finalLifeSlides(decodeSession(session)), []);
  session.state.status = 'ACTIVE';
  assert.deepEqual(finalLifeSlides(session), []);
});

test('malformed highlight values, links, cause details and over 12 slides fail validation', () => {
  const invalid = [
    (s) => { s.highlights.status = 'UNKNOWN'; },
    (s) => { s.highlights.currency = 'USD'; },
    (s) => { s.highlights.partialHistory = 'false'; },
    (s) => { s.highlights.finalizedAtMonth = -1; },
    (s) => { s.highlights.slides = Array(13).fill(s.highlights.slides[0]); },
    (s) => { s.highlights.slides[0].importance = 101; },
    (s) => { s.highlights.slides[0].decisions = []; },
    (s) => { s.highlights.slides[0].decisions[0].balanceChange = Infinity; },
    (s) => { s.highlights.slides[0].decisions[0].statChanges.intelligence = 1.5; },
    (s) => { s.highlights.slides[0].evidence[0].relation = 'UNPROVEN'; },
    (s) => { s.highlights.slides[0].revisions[0].score = -1; },
    (s) => { s.state.history[0].link.phase = 'OTHER'; },
    (s) => { s.state.history[0].link.offeredOptions = null; },
    (s) => { delete s.state.history[0].link.optionLabel; },
    (s) => { s.simulation.death.causeDetails.code = 'MADE_UP'; },
  ];
  for (const change of invalid) {
    const session = highlightsSession();
    change(session);
    assert.throws(() => decodeSession(session), /0\.8\.3/);
  }
});

test('slides use recorded labels/results and neutral evidence, without duplicating the same direct result', () => {
  const slide = highlightsSession().highlights.slides[0];
  slide.evidence.push({ ...slide.evidence[0], id: 'duplicate', historyEventId: 'event-0', text: slide.decisions[0].result });
  const before = structuredClone(slide);
  const paragraphs = lifeSlideParagraphs(slide);
  assert.deepEqual(paragraphs.map((part) => part.text), [
    'Реальный ответ 0 — 1 500 ₽', 'Подтверждённый результат 0', 'Дальнейшая судьба этой главы 0',
  ]);
  assert.deepEqual(slide, before);
});

test('F5 restores the saved slide by stable ID, completion does not replay, manual film starts fresh', () => {
  const slides = highlightsSession().highlights.slides;
  assert.deepEqual(restoreLifeFilmPosition(slides, null, true), { phase: 'intro', slideId: null });
  assert.deepEqual(restoreLifeFilmPosition(slides, '{bad', true), { phase: 'intro', slideId: null });
  const saved = JSON.stringify({ phase: 'slide', slideId: slides[1].id });
  assert.deepEqual(restoreLifeFilmPosition(slides, saved, true), { phase: 'slide', slideId: slides[1].id });
  assert.deepEqual(restoreLifeFilmPosition(slides, '{"phase":"done"}', true), { phase: 'done', slideId: null });
  assert.deepEqual(restoreLifeFilmPosition(slides, saved, false), { phase: 'slide', slideId: slides[0].id });
  assert.deepEqual(restoreLifeFilmPosition([], saved, false), { phase: 'done', slideId: null });
});

test('choices and later confirmations inside a merged chapter remain chronological', () => {
  const slide = highlightsSession().highlights.slides[0];
  slide.decisions.push({
    ...slide.decisions[0], id: 'later-choice', month: 100,
    optionLabel: 'Поздний ответ', result: 'Поздний результат',
  });
  const before = structuredClone(slide);
  assert.deepEqual(lifeSlideParagraphs(slide).map((paragraph) => paragraph.text), [
    'Реальный ответ 0 — 1 500 ₽', 'Подтверждённый результат 0',
    'Дальнейшая судьба этой главы 0', 'Поздний ответ', 'Поздний результат',
  ]);
  assert.deepEqual(slide, before);
});

test('generation, steps, answers, purchases and F5 retain the complete backend highlights snapshot', async () => {
  const response = highlightsSession();
  const paths = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      paths.push([url, options?.method]);
      return String(url).endsWith('/guest')
        ? new Response(null, { status: 204 })
        : Response.json(response);
    },
  }));
  const commands = [
    api.prepareGenerateLocalSession(), api.prepareProgress(response),
    api.prepareAnswer(response.id, 'decision', 'option', response.version),
    api.preparePurchase(response.id, { expectedVersion: response.version, categoryId: 'health', itemId: 'doctor' }),
  ];
  for (const command of commands) {
    assert.deepEqual((await command.execute()).highlights, response.highlights);
  }
  assert.deepEqual((await api.getSession(response.id)).highlights, response.highlights);
  assert.equal(paths.filter(([path]) => String(path).includes('/generated/local')).length, 1);
});
