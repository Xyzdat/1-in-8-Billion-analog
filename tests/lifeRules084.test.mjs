import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { prepareSessionMutation } from '../src/game/sessionMutation.ts';
import { advanceServerClock, getServerClockFrame } from '../src/game/serverClock.ts';
import { adultSession } from './fixtures/adultSession.mjs';
import { highlightsSession } from './fixtures/highlightsSession.mjs';

test('0.8.4 health-zero edit keeps the same life/month and accepts COMPLETE with empty FINAL slides', async () => {
  const initial = adultSession();
  const completed = highlightsSession();
  completed.version = initial.version + 1;
  completed.state.stats.health = 0;
  completed.highlights.slides = [];
  completed.simulation.death.causeDetails = {
    code: 'ACUTE_DISEASE_COMPLICATIONS', label: 'Критическое ухудшение здоровья',
    conditionId: null, model: 'death-causes-1', basis: 'GAME_ASSUMPTION',
  };
  const writes = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      if (options.method !== 'GET') writes.push({ url, method: options.method, body: JSON.parse(options.body) });
      return Response.json(completed);
    },
  }));
  const command = prepareSessionMutation(initial,
    (current) => api.prepareEditCharacter(current.id, current.version, { stats: { health: 0 } }), api.getSession);
  const result = await command(new AbortController().signal);
  assert.equal(result.session.id, initial.id);
  assert.equal(result.session.state.status, 'COMPLETE');
  assert.equal(result.session.simulation.elapsedMonths, initial.simulation.elapsedMonths);
  assert.equal(result.session.highlights.status, 'FINAL');
  assert.deepEqual(result.session.highlights.slides, []);
  assert.deepEqual(writes, [{
    url: `/api/v1/sessions/${initial.id}/character`, method: 'PATCH',
    body: { expectedVersion: initial.version, changes: { stats: { health: 0 } } },
  }]);
  assert.deepEqual((await api.getSession(initial.id)).simulation.death, completed.simulation.death);
  assert.equal(writes.length, 1, 'Restoration must only read the completed life');
});

test('retirement closes an obsolete paid question by accepting the server snapshot without replay or client charges', async () => {
  const initial = adultSession();
  initial.state.age = 65;
  initial.simulation.elapsedMonths = 780;
  initial.state.pendingDecision = { id: 'old-career', title: 'Начать работу?', options: [{ id: 'paid', label: 'Оплатить — 500 ₽' }] };
  const retired = structuredClone(initial);
  retired.version += 1;
  retired.state.pendingDecision = null;
  Object.assign(retired.simulation.adult.career, { status: 'RETIRED', monthlyPay: 0, monthlyPension: 8000 });
  const before = structuredClone(retired);
  let commands = 0;
  const execute = prepareSessionMutation(initial, (current) => ({
    execute: async () => {
      assert.equal(current.version, initial.version);
      commands += 1;
      return decodeSession(retired);
    },
  }), async () => { throw new Error('Successful response needs no automatic retry'); });
  const result = await execute(new AbortController().signal);
  assert.equal(commands, 1);
  assert.equal(result.rejectedCode, undefined);
  assert.deepEqual(result.session, before);
  assert.equal(result.session.state.pendingDecision, null);
  assert.equal(result.session.simulation.adult.career.status, 'RETIRED');
});

test('new part-time/retirement answers are accepted dynamically and a year without questions does not stop time', async () => {
  const session = adultSession();
  session.state.pendingDecision = {
    id: 'work-search', title: 'Как поступить?',
    options: ['full-time', 'part-time', 'mentor', 'volunteer', 'rest'].map((id) => ({ id, label: id })),
  };
  assert.equal(decodeSession(session).state.pendingDecision.options.length, 5);
  const paths = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      if (url.endsWith('/guest')) return new Response(null, { status: 204 });
      paths.push({ url, body: JSON.parse(options.body) });
      return Response.json(session);
    },
  }));
  await api.prepareAnswer(session.id, 'work-search', 'part-time', session.version).execute();
  assert.equal(paths[0].body.optionId, 'part-time');
  session.state.pendingDecision = null;
  for (let month = 420; month < 432; month += 2) {
    session.simulation.elapsedMonths = month;
    session.simulation.monthOfYear = month % 12;
    const frame = getServerClockFrame(session);
    const clock = advanceServerClock({ key: frame.key, milliseconds: 0, playedMs: 0 }, frame, 10000, 1, false);
    assert.equal(clock.milliseconds, frame.durationMs);
  }
});
