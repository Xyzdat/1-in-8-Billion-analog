import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createHistoryPlayback,
  updateHistoryPlayback,
  visibleHistory,
} from '../src/game/historyPlayback.ts';

const event = (id, age = 10) => ({ id, age, title: id, text: id });
const ids = (playback, time) => visibleHistory(playback, time).map(({ id }) => id);

test('opening a save shows its existing history without replaying it', () => {
  const history = [event('birth', 0), event('past', 9)];
  const playback = createHistoryPlayback(5, history);
  assert.deepEqual(ids(playback, 0), ['birth', 'past']);
});

test('new annual events appear individually as the year progresses', () => {
  const original = createHistoryPlayback(1, [event('birth', 0)]);
  const history = [...original.history, event('first'), event('second'), event('third')];
  const playback = updateHistoryPlayback(original, 2, history, 60_000, false);

  assert.deepEqual(ids(playback, 60_000), ['birth']);
  assert.deepEqual(ids(playback, 75_000), ['birth', 'first']);
  assert.deepEqual(ids(playback, 90_000), ['birth', 'first', 'second']);
  assert.deepEqual(ids(playback, 105_000), ['birth', 'first', 'second', 'third']);
  assert.equal(playback.history[1].age, 10);
  assert.equal(original.revealAt.size, 0);
});

test('repeated snapshots do not duplicate or reschedule pending events', () => {
  const initial = createHistoryPlayback(1, [event('birth', 0)]);
  const history = [...initial.history, event('one'), event('two')];
  const first = updateHistoryPlayback(initial, 2, history, 0, false);
  const repeated = updateHistoryPlayback(first, 3, structuredClone(history), 5000, false);

  assert.equal(repeated.revealAt.get('one'), first.revealAt.get('one'));
  assert.deepEqual(ids(repeated, 20_000), ['birth', 'one']);
  assert.deepEqual(ids(repeated, 60_000), ['birth', 'one', 'two']);
});

test('reveal intervals scale with gameplay speed', () => {
  const initial = createHistoryPlayback(1, [event('birth', 0)]);
  const playback = updateHistoryPlayback(initial, 2, [...initial.history, event('one')], 0, false);
  for (const speed of [1, 2, 4, 8, 16]) {
    const secondsToReveal = 30_000 / speed;
    assert.deepEqual(ids(playback, (secondsToReveal - 1) * speed), ['birth']);
    assert.deepEqual(ids(playback, secondsToReveal * speed), ['birth', 'one']);
  }
});

test('further batches retain pending events and reveal additions after them', () => {
  const initial = createHistoryPlayback(1, []);
  const first = updateHistoryPlayback(initial, 2, [event('one')], 0, false);
  const second = updateHistoryPlayback(first, 3, [event('one'), event('two')], 1000, false);
  assert.deepEqual(ids(second, 30_000), ['one']);
  assert.deepEqual(ids(second, 60_000), ['one', 'two']);
});

test('decision context and completed life expose all confirmed history', () => {
  const initial = createHistoryPlayback(1, []);
  const pending = updateHistoryPlayback(initial, 2, [event('one'), event('two')], 0, false);
  const checkpoint = updateHistoryPlayback(pending, 3, [...pending.history, event('decision')], 0, true);
  assert.deepEqual(ids(checkpoint, 0), ['one', 'two', 'decision']);
  assert.equal(checkpoint.revealAt.size, 0);
});
