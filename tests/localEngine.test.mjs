import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { localEngineErrorMessages } from '../src/api/errors.ts';
import { advanceServerClock, getServerClockFrame, getServerClockKey, getServerYearProgress } from '../src/game/serverClock.ts';
import { createHistoryPlayback, updateSessionHistory, visibleHistory } from '../src/game/historyPlayback.ts';

const id = '12345678-1234-1234-1234-123456789abc';
function saved(months = 0, version = 1) {
  return {
    id, provider: 'local', version, savedAt: '2026-11-24T09:00:00Z',
    character: {
      name: 'Алекс', gender: 'Мужчина', birthYear: 2026,
      birthplace: { countryCode: 'RU', country: 'Россия', city: null },
    },
    simulation: {
      engineVersion: 'childhood-1', statisticsRelease: 'wdi-2023-20261111', statisticsYear: 2023,
      elapsedMonths: months, monthOfYear: months % 12, stepMonths: 2,
      family: [{ id: 'mother', role: 'mother', name: 'Анна', age: 28, alive: true, closeness: 90, trust: 0 }],
      skills: { drawing: 0 }, assumptions: [],
    },
    state: {
      age: Math.floor(months / 12), status: 'ACTIVE',
      stats: { health: 90, intelligence: 70, happiness: 80, relationships: 90, appearance: null, aura: 0 },
      pendingDecision: null,
      history: [{ id: 'birth', age: 0, title: 'Рождение', text: 'Россия' }],
    },
  };
}
const initialClock = (session) => ({ key: getServerClockKey(session), milliseconds: 0, playedMs: 0 });

test('0.6 simulation accepts absent/null blocks and preserves family, skills, zero and false', () => {
  const data = saved(8);
  data.simulation.family[0].alive = false;
  data.simulation.skills['arbitrary-future-skill'] = 100;
  assert.equal(decodeSession(data), data);
  assert.equal(decodeSession(data).simulation.family[0].trust, 0);
  for (const provider of ['local', '1in8b']) {
    const legacy = { ...saved(), provider };
    delete legacy.simulation;
    assert.equal(decodeSession(legacy).simulation, undefined);
    legacy.simulation = null;
    assert.equal(decodeSession(legacy).simulation, null);
  }
  data.simulation.family = [];
  data.simulation.skills = {};
  assert.doesNotThrow(() => decodeSession(data));
});

test('simulation decoder rejects malformed required fields and nested values', () => {
  for (const mutate of [
    (s) => { delete s.engineVersion; },
    (s) => { s.elapsedMonths = -1; },
    (s) => { s.monthOfYear = 12; },
    (s) => { s.stepMonths = 1; },
    (s) => { s.skills.drawing = null; },
    (s) => { s.skills.drawing = 101; },
    (s) => { s.skills = []; },
    (s) => { s.skills = null; },
    (s) => { s.family[0].alive = 'false'; },
    (s) => { s.family[0].closeness = -1; },
    (s) => { delete s.family[0].id; },
    (s) => { s.assumptions = [false]; },
  ]) {
    const data = saved();
    mutate(data.simulation);
    assert.throws(() => decodeSession(data));
  }
});

test('local generation and recovery use guest, one immutable command and the same session', async () => {
  const commands = [];
  let tries = 0;
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      assert.equal(options.credentials, 'same-origin');
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      if (options.method === 'GET') {
        assert.equal(url, `/api/v1/sessions/${id}`);
        return Response.json(saved(8, 5));
      }
      assert.equal(url, '/api/v1/sessions/generated/local');
      commands.push({ key: options.headers.get('Idempotency-Key'), body: options.body });
      if (++tries === 1) throw new TypeError('Lost response');
      return Response.json(saved());
    },
  }));
  const request = { countryIso3: 'RUS', birthYear: 2026 };
  const command = api.prepareGenerateLocalSession(request);
  request.countryIso3 = 'IND';
  await assert.rejects(command.execute(), { kind: 'network' });
  assert.equal((await command.execute()).id, id);
  assert.deepEqual(commands[0], commands[1]);
  assert.deepEqual(JSON.parse(commands[1].body), { countryIso3: 'RUS', birthYear: 2026 });
  const restored = await api.getSession(id);
  assert.equal(restored.simulation.elapsedMonths, 8);
  assert.equal(getServerYearProgress(initialClock(restored), getServerClockFrame(restored)), 8 / 12);
  assert.equal(commands.length, 2);
});

test('empty generation remains local while explicit external generation retains its old route', async () => {
  const calls = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      calls.push({ url, body: options.body });
      return Response.json(saved());
    },
  }));
  await api.prepareGenerateLocalSession().execute();
  await api.prepareGenerateSession().execute();
  assert.deepEqual(calls, [
    { url: '/api/v1/sessions/generated/local', body: '{}' },
    { url: '/api/v1/sessions/generated', body: '{}' },
  ]);
  assert.throws(() => api.prepareGenerateLocalSession({ countryIso3: 'RU' }));
  assert.throws(() => api.prepareGenerateLocalSession({ birthYear: 2022 }));
  assert.throws(() => api.prepareStep(id, 0));
});

test('progress selects step by simulation presence, and advance for old local and 1in8b', async () => {
  const calls = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      calls.push({ url, body: options.body });
      return Response.json(saved(2, 2));
    },
  }));
  for (const data of [saved(), { ...saved(), simulation: null }, { ...saved(), simulation: undefined },
    { ...saved(), provider: '1in8b', simulation: null }]) {
    await api.prepareProgress(data).execute();
  }
  assert.deepEqual(calls.map((call) => call.url.split('/').at(-1)), ['step', 'advance', 'advance', 'advance']);
  assert(calls.every((call) => call.body === '{"expectedVersion":1}'));
});

test('lost step response retries the same key and expectedVersion; decisions use existing answers route', async () => {
  const calls = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      calls.push({ url, key: options.headers.get('Idempotency-Key'), body: options.body });
      if (calls.length === 1) throw new TypeError('Lost step response');
      return Response.json(saved(38, calls.length + 1));
    },
  }));
  const command = api.prepareProgress(saved(36, 19));
  await assert.rejects(command.execute(), { kind: 'network' });
  await command.execute();
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].url, `/api/v1/sessions/${id}/step`);
  assert.equal(calls[0].body, '{"expectedVersion":19}');
  await api.prepareAnswer(id, 'choice', 'draw', 20).execute();
  assert.equal(calls[2].url, `/api/v1/sessions/${id}/decisions/choice/answers`);
  assert.deepEqual(JSON.parse(calls[2].body), { expectedVersion: 20, optionId: 'draw' });
});

test('two months take 10 seconds at 1x; all speeds preserve pause and partial progress', () => {
  const session = saved(4);
  const frame = getServerClockFrame(session);
  assert.equal(frame.durationMs, 10_000);
  for (const speed of [1, 2, 4, 8, 16]) {
    let clock = advanceServerClock(initialClock(session), frame, 5000 / speed, speed, false);
    assert.equal(clock.milliseconds, 5000);
    const paused = advanceServerClock(clock, frame, 100_000, speed, true);
    assert.deepEqual(paused, clock);
    clock = advanceServerClock(paused, frame, 5000 / speed, speed, false);
    assert.equal(clock.milliseconds, 10_000);
    assert.equal(getServerYearProgress(clock, frame), 6 / 12);
  }
  let clock = advanceServerClock(initialClock(session), frame, 2000, 1, false);
  clock = advanceServerClock(clock, frame, 1000, 2, false);
  clock = advanceServerClock(clock, frame, 1500, 4, false);
  assert.equal(clock.milliseconds, 10_000);
  assert.equal(getServerClockFrame({ ...session, simulation: null }).durationMs, 60_000);
});

test('six confirmed steps complete a year; F5 restores the last confirmed month', () => {
  let playedMs = 0;
  for (let months = 0; months < 12; months += 2) {
    const data = saved(months);
    const frame = getServerClockFrame(data);
    const clock = advanceServerClock({ ...initialClock(data), playedMs }, frame, 10_000, 1, false);
    playedMs = clock.playedMs;
    assert(Math.abs(getServerYearProgress(clock, frame) - (months + 2) / 12) < 1e-12);
    const restored = saved(months + 2);
    assert.equal(getServerYearProgress(initialClock(restored), getServerClockFrame(restored)), ((months + 2) % 12) / 12);
  }
  assert.equal(playedMs, 60_000);
});

test('purchases and answers preserve partial interval; only elapsedMonths or session ID resets it', () => {
  const data = saved(38, 20);
  const clock = advanceServerClock(initialClock(data), getServerClockFrame(data), 4000, 1, false);
  const answered = { ...data, version: 21, state: { ...data.state, pendingDecision: { id: 'new-decision' } } };
  assert.equal(getServerClockKey(answered), clock.key);
  const resumed = advanceServerClock(clock, getServerClockFrame(answered), 1000, 1, false);
  assert.equal(resumed.milliseconds, 5000);
  assert.equal(advanceServerClock(resumed, getServerClockFrame(saved(40, 22)), 0, 1, false).milliseconds, 0);
  assert.notEqual(getServerClockKey({ ...data, id: 'other' }), clock.key);
});

test('stepped events are visible immediately once; legacy batches retain gradual playback', () => {
  const data = saved(2, 2);
  data.state.history.push({ id: 'first-step', age: 0, title: 'Событие', text: 'Два месяца' });
  const initial = createHistoryPlayback(1, data.state.history.slice(0, 1));
  const current = updateSessionHistory(initial, data, 10_000);
  assert.equal(visibleHistory(current, 10_000).length, 2);
  assert.equal(current.revealAt.size, 0);
  assert.equal(visibleHistory(updateSessionHistory(current, { ...data, version: 3 }, 10_000), 10_000).length, 2);
  const legacy = updateSessionHistory(initial, { ...data, simulation: null }, 10_000);
  assert.equal(visibleHistory(legacy, 10_000).length, 1);
});

test('new engine error codes retain structured errors, localized messages and no silent fallback', async () => {
  for (const code of ['STEP_REQUIRED', 'STEP_UNSUPPORTED', 'STATISTICS_NOT_READY', 'CONTENT_UNAVAILABLE', 'ENGINE_VERSION_UNAVAILABLE']) {
    assert(localEngineErrorMessages[code]);
    let commands = 0;
    const api = createSessionsApi(createApiClient({
      baseUrl: '/api',
      fetcher: async (url) => {
        if (url.endsWith('/guest')) return new Response(null, { status: 204 });
        commands += 1;
        return Response.json({ code, message: 'Unavailable' }, { status: 409 });
      },
    }));
    await assert.rejects(api.prepareProgress(saved()).execute(), { code });
    assert.equal(commands, 1);
  }
});
