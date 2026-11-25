import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLifeFilmClock, LIFE_SLIDE_MS, LIFE_INTRO_MS } from '../src/game/lifeFilm.ts';

function fixture(initial = { phase: 'intro', slideId: null }, ids = ['a', 'b', 'c']) {
  let now = 0;
  let handle = 0;
  let finished = 0;
  let current;
  const timers = new Map();
  const clock = createLifeFilmClock(ids, initial, {
    now: () => now,
    schedule: (callback, delay) => {
      timers.set(++handle, { at: now + delay, callback });
      return handle;
    },
    clear: (key) => timers.delete(key),
  }, (snapshot) => { current = snapshot; }, () => { finished += 1; });
  return {
    clock,
    view: () => current,
    finished: () => finished,
    count: () => timers.size,
    advance(delta) {
      const target = now + delta;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > target) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
      }
      now = target;
    },
  };
}

test('intro transitions to chronological slides, each lasts exactly five seconds, finish fires once', () => {
  const f = fixture();
  f.clock.start();
  assert.equal(f.count(), 1);
  f.advance(LIFE_INTRO_MS - 1);
  assert.equal(f.view().position.phase, 'intro');
  f.advance(1);
  assert.equal(f.view().position.slideId, 'a');
  for (const id of ['a', 'b', 'c']) {
    assert.equal(f.view().position.slideId, id);
    f.advance(LIFE_SLIDE_MS - 1);
    assert.equal(f.view().position.slideId, id);
    f.advance(1);
  }
  assert.equal(f.view().position.phase, 'done');
  assert.equal(f.count(), 0);
  assert.equal(f.finished(), 1);
  f.clock.next(f.view().token);
  f.advance(60000);
  assert.equal(f.finished(), 1);
});

test('skip advances only the current slide, stale click/timeout tokens cannot skip the next one', () => {
  const f = fixture({ phase: 'slide', slideId: 'a' });
  f.clock.start();
  const oldToken = f.view().token;
  f.advance(4999);
  f.clock.next(oldToken);
  f.clock.next(oldToken);
  f.advance(1);
  assert.equal(f.view().position.slideId, 'b');
  assert.equal(f.count(), 1);
  f.advance(4999);
  assert.equal(f.view().position.slideId, 'c');
});

test('hidden tab pauses the remaining interval and unmount cancels every timer', () => {
  const f = fixture({ phase: 'slide', slideId: 'b' });
  f.clock.start();
  f.advance(2000);
  f.clock.pause();
  assert.equal(f.count(), 0);
  f.advance(60000);
  assert.equal(f.view().position.slideId, 'b');
  f.clock.resume();
  f.advance(2999);
  assert.equal(f.view().position.slideId, 'b');
  f.advance(1);
  assert.equal(f.view().position.slideId, 'c');
  f.clock.dispose();
  assert.equal(f.count(), 0);
  f.advance(60000);
  assert.equal(f.finished(), 0);
});

test('empty final selection finishes after intro; an already watched life finishes without new timers', () => {
  const empty = fixture({ phase: 'intro', slideId: null }, []);
  empty.clock.start();
  empty.advance(LIFE_INTRO_MS);
  assert.equal(empty.finished(), 1);
  assert.equal(empty.count(), 0);
  const watched = fixture({ phase: 'done', slideId: null });
  watched.clock.start();
  watched.clock.start();
  assert.equal(watched.finished(), 1);
  assert.equal(watched.count(), 0);
});
