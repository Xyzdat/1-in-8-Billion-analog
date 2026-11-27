import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { ApiError } from '../src/api/errors.ts';
import { prepareSessionMutation } from '../src/game/sessionMutation.ts';
import { getServerClockKey } from '../src/game/serverClock.ts';
import { yearFocusOptions } from '../src/game/yearFocusPresentation.ts';
import { yearFocusSession } from './fixtures/yearFocusSession.mjs';

test('0.10.0 accepts full focus, previous-direction lastApplied, empty maps and old nullable/absent saves', () => {
  const session = yearFocusSession();
  assert.deepEqual(decodeSession(JSON.parse(JSON.stringify(session))), session);
  for (const focus of [undefined, null, session.simulation.yearlyFocus]) {
    const old = structuredClone(session);
    old.simulation.yearlyFocus = focus;
    assert.equal(decodeSession(old), old);
  }
  for (const provider of ['local', '1in8b']) {
    const old = structuredClone(session);
    old.provider = provider;
    old.simulation = null;
    assert.equal(decodeSession(old), old);
  }
  session.simulation.yearlyFocus.lastApplied = null;
  assert.equal(decodeSession(session), session);
});

test('focus decoder rejects malformed IDs, durations, maps, availability and lastApplied', () => {
  for (const mutate of [
    (f) => { f.modelVersion = 'unknown'; },
    (f) => { f.year = -1; },
    (f) => { f.selectedId = 'random'; },
    (f) => { f.changedMonth = 1.5; },
    (f) => { f.canChange = 'true'; },
    (f) => { f.options[0].available = null; },
    (f) => { f.options[0].reason = undefined; },
    (f) => { f.options[0].effects.periodMonths = 6; },
    (f) => { f.options[0].effects.stats.health = null; },
    (f) => { f.options[0].effects.skills.learning = 0.5; },
    (f) => { f.options[0].effects.closeness = []; },
    (f) => { f.options[0].matchingEventWeightMultiplier = 2; },
    (f) => { f.lastApplied.month = -1; },
    (f) => { f.lastApplied.closeness.mother = '2'; },
  ]) {
    const session = yearFocusSession();
    mutate(session.simulation.yearlyFocus);
    assert.throws(() => decodeSession(session));
  }
});

test('focus presentation uses server order, labels, availability, annual rates and average closeness', () => {
  const session = yearFocusSession();
  const original = structuredClone(session);
  const { yearlyFocus } = session.simulation;
  const options = yearFocusOptions(yearlyFocus);
  assert.deepEqual(options.map((item) => item.id), ['balanced', 'home', 'work']);
  assert.equal(options[0].title, 'Баланс сервера');
  assert.deepEqual(options[0].effects, []);
  assert.equal(options[2].available, false);
  assert.equal(options[2].reason, 'Доступно с 18 лет.');
  assert.equal(options[1].description, 'Общие дела с близкими.');
  assert.deepEqual(options[1].effects.map(({ text }) => text), [
    'Отношения +2', 'Интеллект −1', 'Ответственность +2', 'Близкие: +0,67',
  ]);
  assert.equal(new Set(options[1].effects.map((effect) => effect.id)).size, options[1].effects.length);
  assert.deepEqual(session, original, 'Annual rates and lastApplied must never be added to state by presentation');
});

test('focus PATCH waits for guest, preserves key/body on lost response and receives the full updated snapshot', async () => {
  const session = yearFocusSession();
  const updated = structuredClone(session);
  updated.version += 1;
  updated.simulation.yearlyFocus.selectedId = 'balanced';
  updated.state.history[0].importance = 73;
  const calls = [];
  let writes = 0;
  const api = createSessionsApi(createApiClient({ baseUrl: '/api', fetcher: async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.credentials, 'same-origin');
    if (url.endsWith('/guest')) return new Response(null, { status: 204 });
    assert.equal(options.method, 'PATCH');
    assert.equal(url, `/api/v1/sessions/${session.id}/focus`);
    assert.deepEqual(JSON.parse(options.body), { expectedVersion: session.version, focusId: 'balanced' });
    writes += 1;
    if (writes === 1) throw new TypeError('Lost response');
    return Response.json(updated);
  } }));
  const command = api.prepareFocus(session.id, session.version, 'balanced');
  await assert.rejects(command.execute());
  const result = await command.execute();
  assert.deepEqual(result, updated);
  assert.equal(getServerClockKey(result), getServerClockKey(session));
  assert.deepEqual(result.state.stats, session.state.stats);
  assert.equal(result.state.history[0].importance, 73);
  const requests = calls.filter((call) => call.url.endsWith('/focus'));
  assert.equal(requests[0].options.headers.get('Idempotency-Key'), requests[1].options.headers.get('Idempotency-Key'));
  assert.equal(requests[0].options.body, requests[1].options.body);
  assert.notEqual(api.prepareFocus(session.id, result.version, 'home').idempotencyKey, command.idempotencyKey);
  for (let index = 0; index < calls.length; index += 2) assert(calls[index].url.endsWith('/guest'));
  for (const [version, id] of [[0, 'home'], [1, 'unknown']]) assert.throws(() => api.prepareFocus(session.id, version, id));
});

for (const code of ['VERSION_CONFLICT', 'FOCUS_UNSUPPORTED', 'FOCUS_UNAVAILABLE', 'IDEMPOTENCY_CONFLICT', 'SESSION_COMPLETE']) {
  test(`${code} refreshes focus and the complete snapshot without repeating a rejected choice`, async () => {
    const before = yearFocusSession();
    const latest = structuredClone(before);
    latest.version += 1;
    if (code === 'FOCUS_UNSUPPORTED') latest.simulation.yearlyFocus = null;
    if (code === 'SESSION_COMPLETE') latest.state.status = 'COMPLETE';
    let writes = 0;
    let reads = 0;
    const execute = prepareSessionMutation(before, () => ({ execute: async () => {
      writes += 1;
      throw new ApiError('Rejected', 'http', 409, { code });
    } }), async (id) => {
      assert.equal(id, before.id);
      reads += 1;
      if (reads === 1) throw new ApiError('Offline', 'network');
      return latest;
    });
    await assert.rejects(execute(new AbortController().signal));
    const result = await execute(new AbortController().signal);
    assert.equal(result.session, latest);
    assert.equal(result.rejectedCode, code);
    assert.equal(writes, 1);
    assert.equal(reads, 2);
  });
}
