import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { toServerDecision, toServerHistory } from '../src/game/serverPresentation.ts';
import { createHistoryPlayback, updateSessionHistory, visibleHistory } from '../src/game/historyPlayback.ts';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';

test('0.9.1 history accepts missing/null importance and both sources, including zero and score limits', () => {
  for (const metadata of [
    {}, { importance: null, importanceSource: null },
    { importance: 0, importanceSource: 'EVENT_RULE' },
    { importance: 100, importanceSource: 'LIFE_STORY' },
  ]) {
    const session = birthAndLifeSession();
    Object.assign(session.state.history[0], metadata);
    const restored = decodeSession(JSON.parse(JSON.stringify(session)));
    assert.deepEqual(toServerHistory(restored.state.history), toServerHistory(session.state.history));
    assert.equal(restored.state.history[0].importance, metadata.importance);
  }
  for (const metadata of [
    { importance: -1 }, { importance: 101 }, { importance: 1.5 },
    { importance: '21' }, { importance: false }, { importanceSource: 'GUESSED' },
  ]) {
    const session = birthAndLifeSession();
    Object.assign(session.state.history[0], metadata);
    assert.throws(() => decodeSession(session));
  }
});

test('new snapshots replace scores on all existing events even when version, IDs and count are unchanged', () => {
  const session = birthAndLifeSession();
  session.state.history[0].importance = 50;
  session.state.history[1].importance = 21;
  const before = structuredClone(session);
  const previous = createHistoryPlayback(session.version, session.state.history);
  const updated = structuredClone(session);
  updated.state.history[0].importance = 70;
  updated.state.history[1].importance = 8;
  updated.state.history[1].importanceSource = 'LIFE_STORY';
  const playback = updateSessionHistory(previous, decodeSession(updated), 0);
  const history = toServerHistory(visibleHistory(playback, 0));
  assert.deepEqual(history.map(({ id, importance }) => ({ id, importance })), [
    { id: 'birth', importance: 70 }, { id: 'decision-46', importance: 8 },
  ]);
  assert.equal(history[1].importanceSource, 'LIFE_STORY');
  assert.equal(playback.version, previous.version);
  assert.deepEqual(session, before);
});

test('legacy playback refreshes old scores without revealing or delaying pending events again', () => {
  const session = birthAndLifeSession();
  session.simulation = null;
  const initial = createHistoryPlayback(1, [session.state.history[0]]);
  const pending = updateSessionHistory(initial, session, 0);
  const restored = structuredClone(session);
  restored.state.history[0].importance = 50;
  const refreshed = updateSessionHistory(pending, restored, 1000);
  assert.equal(refreshed.revealAt.get('decision-46'), pending.revealAt.get('decision-46'));
  assert.equal(visibleHistory(refreshed, 1000)[0].importance, 50);
});

test('option effects enforce nested required maps, integer deltas and independent aura range', () => {
  const base = { scope: 'IMMEDIATE', stats: {}, closeness: {} };
  const decode = (effects) => {
    const session = birthAndLifeSession();
    session.state.pendingDecision = { id: 'choice', title: 'Выбор', options: [{ id: 'a', label: 'Ответ', effects }] };
    return decodeSession(session);
  };
  for (const effects of [
    undefined, null, base,
    { ...base, stats: { health: -100, happiness: 100, intelligence: 0, relationships: 1, appearance: -1, aura: -200 } },
    { ...base, stats: { aura: 200 }, closeness: { 'mother-custom-id': 100, 'father': -100, 'sibling-9': 0 } },
  ]) assert.equal(decode(effects).state.pendingDecision.options[0].effects, effects);
  for (const effects of [
    {}, { scope: 'IMMEDIATE' }, { ...base, stats: null }, { ...base, closeness: [] },
    { ...base, stats: { health: 101 } }, { ...base, stats: { happiness: -101 } },
    { ...base, stats: { aura: -201 } }, { ...base, stats: { appearance: null } },
    { ...base, stats: { unknown: 1 } }, { ...base, closeness: { mother: 101 } },
    { ...base, closeness: { mother: '1' } }, { ...base, closeness: { mother: 0.5 } },
  ]) assert.throws(() => decode(effects));
});

test('preview is copied by stable IDs, preserves capped deltas and never changes the saved state', () => {
  const session = birthAndLifeSession();
  session.simulation.family[0].closeness = 99;
  session.state.stats.relationships = 99;
  session.state.pendingDecision = {
    id: 'choice', title: 'Помочь?', options: [
      { id: 'help', label: 'Помочь', effects: {
        scope: 'IMMEDIATE', stats: { relationships: 1, aura: -2 },
        closeness: { 'mother-custom-id': 1, 'sibling-0': -2, 'sibling-9': 1 },
      } },
      { id: 'unknown', label: 'Неизвестно', effects: null },
      { id: 'empty', label: 'Другой путь', effects: { scope: 'IMMEDIATE', stats: {}, closeness: {} } },
    ],
  };
  const original = structuredClone(session);
  const restored = decodeSession(JSON.parse(JSON.stringify(session)));
  const presented = toServerDecision(restored.state.pendingDecision, restored.state.history);
  assert.deepEqual(presented.options[0].changes, { relationships: 1, aura: -2 });
  assert.deepEqual(presented.options[0].closeness, { 'mother-custom-id': 1, 'sibling-0': -2, 'sibling-9': 1 });
  assert.equal(presented.options[1].changes, undefined);
  assert.equal(presented.options[1].closeness, undefined);
  assert.deepEqual(presented.options[2].changes, {});
  assert.deepEqual(presented.options[2].closeness, {});
  presented.options[0].closeness['mother-custom-id'] = 50;
  presented.options[0].changes.aura = 20;
  assert.deepEqual(restored, original);
  assert.deepEqual(session, original);
});

test('old and external sessions do not invent importance or effect previews from narrative text', () => {
  for (const provider of ['local', '1in8b']) {
    const session = birthAndLifeSession();
    session.provider = provider;
    session.simulation = null;
    session.state.pendingDecision = {
      id: 'choice', title: 'Важнейший выбор', options: [{ id: 'a', label: 'Здоровье +10' }],
    };
    const restored = decodeSession(session);
    assert.equal(toServerHistory(restored.state.history)[0].importance, undefined);
    assert.equal(toServerDecision(restored.state.pendingDecision, restored.state.history).options[0].changes, undefined);
  }
});
