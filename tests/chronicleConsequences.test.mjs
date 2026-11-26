import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { toServerHistory } from '../src/game/serverPresentation.ts';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';
import { highlightsSession } from './fixtures/highlightsSession.mjs';

test('event stat deltas accept omitted/null blocks, negative changes and actual capped changes', () => {
  const session = birthAndLifeSession();
  const event = session.state.history[1];
  for (const stats of [undefined, null, {}, { health: -100, happiness: 100, intelligence: 1, relationships: 0, appearance: -1, aura: 200 }]) {
    event.consequences.stats = stats;
    assert.equal(decodeSession(session), session);
  }
  for (const stats of [{ health: 101 }, { happiness: -101 }, { intelligence: 1.5 }, { appearance: null }, { aura: -201 }, []]) {
    event.consequences.stats = stats;
    assert.throws(() => decodeSession(session));
  }
});

test('confirmed event consequences are labels only and survive restoration without changing state again', () => {
  const session = birthAndLifeSession();
  session.state.stats.intelligence = 100;
  session.state.history[1].consequences = {
    aura: 2, closeness: { 'mother-custom-id': 1 },
    stats: { health: -3, happiness: 1, intelligence: 1, relationships: 0, appearance: -2, aura: 2 },
  };
  const before = structuredClone(session);
  const events = toServerHistory(decodeSession(session).state.history);
  assert.deepEqual(events[1].changes, { health: -3, happiness: 1, intelligence: 1, appearance: -2 });
  assert.equal(events[1].aura, 2);
  assert.deepEqual(events[1].closeness, { 'mother-custom-id': 1 });
  assert.deepEqual(toServerHistory(decodeSession(JSON.parse(JSON.stringify(session))).state.history), events);
  assert.deepEqual(toServerHistory(session.state.history), events);
  assert.deepEqual(session, before);
  assert.equal(session.state.stats.intelligence, 100, 'A capped +1 must not be recalculated or added again');
});

test('existing confirmed decision deltas are joined only by historyEventId and never summed across slides', () => {
  const session = highlightsSession();
  const decision = session.highlights.slides[0].decisions[0];
  decision.statChanges = { intelligence: 3, happiness: -2, appearance: 1, aura: -1, unknown: 20 };
  session.highlights.slides[1].decisions.push(structuredClone(decision));
  const history = [
    { id: decision.historyEventId, age: 6, title: 'Совпадающий заголовок', text: 'Результат выбора' },
    { id: 'unrelated', age: 6, title: 'Совпадающий заголовок', text: 'Другое событие' },
  ];
  const before = structuredClone({ history, highlights: session.highlights });
  const events = toServerHistory(history, session.highlights);
  assert.deepEqual(events[0].changes, { intelligence: 3, happiness: -2, appearance: 1 });
  assert.equal(events[0].aura, -1);
  assert.deepEqual(events[1].changes, {});
  assert.equal(events[1].aura, undefined);
  assert.deepEqual({ history, highlights: session.highlights }, before);
  history[0].consequences = { aura: 0, closeness: {}, stats: { intelligence: 1 } };
  assert.deepEqual(toServerHistory(history, session.highlights)[0].changes, { intelligence: 1 });
  assert.equal(toServerHistory(history, session.highlights)[0].aura, 0);
});

test('old and 1in8b events without individual deltas do not invent effects from text or total scores', () => {
  const history = [{ id: 'toy', age: 0, title: 'Игрушка', text: 'Ты учишься и становишься счастливее.' }];
  for (const highlights of [null, undefined]) {
    const [event] = toServerHistory(history, highlights);
    assert.deepEqual(event.changes, {});
    assert.equal(event.aura, undefined);
    assert.equal(event.closeness, undefined);
  }
});
