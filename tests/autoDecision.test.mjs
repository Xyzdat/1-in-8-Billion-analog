import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_DECISION_DELAY_MS, scheduleAutoDecision } from '../src/game/autoDecision.ts';

function fakeTime() {
  let now = 0;
  let id = 0;
  const pending = new Map();
  return {
    scheduler: {
      now: () => now,
      schedule: (callback, delay) => {
        id += 1;
        pending.set(id, { callback, at: now + delay });
        return id;
      },
      clear: (handle) => pending.delete(handle),
    },
    advance(delta) {
      const target = now + delta;
      for (;;) {
        const next = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > target) break;
        now = next[1].at;
        pending.delete(next[0]);
        next[1].callback();
      }
      now = target;
    },
    stalledFrame(delta) {
      now += delta;
      const next = [...pending][0];
      if (next) {
        pending.delete(next[0]);
        next[1].callback();
      }
    },
    count: () => pending.size,
  };
}

test('auto decision waits three real seconds and executes exactly once with a countdown', () => {
  const time = fakeTime();
  const countdown = [];
  let choices = 0;
  scheduleAutoDecision(() => { choices += 1; }, (seconds) => countdown.push(seconds), time.scheduler);
  assert.equal(AUTO_DECISION_DELAY_MS, 3000);
  assert.deepEqual(countdown, [3]);
  time.advance(2999);
  assert.equal(choices, 0);
  time.advance(1);
  assert.equal(choices, 1);
  assert.deepEqual(countdown, [3, 2, 1, 0]);
  time.advance(30_000);
  assert.equal(choices, 1);
  assert.equal(time.count(), 0);
});

test('cancelling or unmounting clears the pending choice and countdown', () => {
  const time = fakeTime();
  const countdown = [];
  let choices = 0;
  const cancel = scheduleAutoDecision(() => { choices += 1; }, (seconds) => countdown.push(seconds), time.scheduler);
  time.advance(1000);
  cancel();
  cancel();
  const before = [...countdown];
  time.advance(60_000);
  assert.equal(choices, 0);
  assert.deepEqual(countdown, before);
  assert.equal(time.count(), 0);
});

test('a manual answer at the deadline prevents a later automatic answer', () => {
  const time = fakeTime();
  const choices = [];
  const cancel = scheduleAutoDecision(() => choices.push('automatic'), () => {}, time.scheduler);
  time.advance(2999);
  cancel();
  choices.push('manual');
  time.advance(10_000);
  assert.deepEqual(choices, ['manual']);
});

test('a replacement decision gets its full three seconds without an old timer firing', () => {
  const time = fakeTime();
  const choices = [];
  const cancel = scheduleAutoDecision(() => choices.push('old'), () => {}, time.scheduler);
  time.advance(2000);
  cancel();
  scheduleAutoDecision(() => choices.push('new'), () => {}, time.scheduler);
  time.advance(2999);
  assert.deepEqual(choices, []);
  time.advance(1);
  assert.deepEqual(choices, ['new']);
});

test('a delayed browser frame uses elapsed real time rather than accumulating interval ticks', () => {
  const time = fakeTime();
  let choices = 0;
  scheduleAutoDecision(() => { choices += 1; }, () => {}, time.scheduler);
  time.stalledFrame(5000);
  assert.equal(choices, 1);
  assert.equal(time.count(), 0);
});
