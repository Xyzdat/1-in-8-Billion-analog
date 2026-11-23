import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { createSessionsApi } from '../src/api/sessions.ts';
import { decodeSession, decodeSessionList } from '../src/api/sessionDecoders.ts';
import { toCharacterChanges, toCharacterParameters, toCreateSessionRequest } from '../src/api/characterMapper.ts';

const sessionId = '12345678-1234-1234-1234-123456789abc';
const character = {
  name: 'Алекс',
  gender: 'Мужчина',
  birthYear: 2026,
  birthplace: { countryCode: 'CA', country: 'Канада', city: 'Оттава' },
};
const startingStats = { health: 91, intelligence: 72, appearance: 64 };

function savedSession(age = 0, version = 1) {
  return {
    id: sessionId,
    provider: 'local',
    character: structuredClone(character),
    version,
    savedAt: '2026-11-23T10:00:00Z',
    state: {
      age,
      status: 'ACTIVE',
      stats: { ...startingStats, happiness: 80, relationships: 90, aura: 0 },
      pendingDecision: null,
      history: [{ id: 'birth', age: 0, title: 'Рождение', text: 'Начало жизни' }],
    },
  };
}

test('contract flow waits for guest, creates, loads, advances and answers with version', async () => {
  let saved = savedSession();
  const calls = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      calls.push({ url, options });
      assert.equal(options.credentials, 'same-origin');
      if (url === '/api/v1/guest') {
        assert.equal(options.body, '{}');
        assert.equal(options.method, 'POST');
        return new Response(null, { status: 204 });
      }
      if (options.method === 'POST') {
        assert.match(options.headers.get('Idempotency-Key'), /^[0-9a-f-]{36}$/);
      }
      const body = options.body ? JSON.parse(options.body) : undefined;
      if (url.endsWith('/advance')) {
        assert.equal(body.expectedVersion, saved.version);
        saved = savedSession(3, 4);
        saved.state.pendingDecision = {
          id: 'toy',
          title: 'Выбери игру',
          options: [{ id: 'build', label: 'Построить дом' }],
        };
      } else if (url.endsWith('/answers')) {
        assert.equal(url, `/api/v1/sessions/${sessionId}/decisions/toy/answers`);
        assert.deepEqual(body, { expectedVersion: 4, optionId: 'build' });
        saved.version = 5;
        saved.state.pendingDecision = null;
        saved.state.stats.intelligence = 75;
      } else if (options.method === 'POST') {
        assert.deepEqual(body, { character, startingStats });
      }
      return Response.json(saved);
    },
  }));

  const create = api.prepareCreateSession({ character, startingStats });
  let result = await create.execute();
  assert.equal(result.id, sessionId);
  assert.equal(result.state.age, 0);
  result = await api.getSession(sessionId);
  result = await api.prepareAdvance(result.id, result.version).execute();
  assert.equal(result.state.pendingDecision.options[0].id, 'build');
  result = await api.prepareAnswer(result.id, 'toy', 'build', result.version).execute();
  assert.equal(result.state.age, 3);
  assert.equal(result.state.stats.intelligence, 75);
  assert.equal(result.state.pendingDecision, null);
  for (let index = 0; index < calls.length; index += 2) {
    assert.equal(calls[index].url, '/api/v1/guest');
  }
});

test('retry preserves key, version and original payload; a new command gets a new key', async () => {
  const bodies = [];
  const keys = [];
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      if (url.endsWith('/guest')) {
        return new Response(null, { status: 204 });
      }
      bodies.push(options.body);
      keys.push(options.headers.get('Idempotency-Key'));
      if (keys.length === 1) {
        throw new TypeError('Response lost');
      }
      return Response.json(savedSession());
    },
  }));
  const request = { character: structuredClone(character), startingStats };
  const command = api.prepareCreateSession(request);
  request.character.name = 'Другой персонаж';

  await assert.rejects(command.execute(), { kind: 'network' });
  await command.execute();
  assert.equal(keys[0], keys[1]);
  assert.equal(bodies[0], bodies[1]);
  assert.equal(JSON.parse(bodies[1]).character.name, 'Алекс');
  assert.notEqual(api.prepareAdvance(sessionId, 1).idempotencyKey, command.idempotencyKey);
});

test('concurrent reads share one pending guest initialization', async () => {
  let releaseGuest;
  let guestCalls = 0;
  const guestReady = new Promise((resolve) => { releaseGuest = resolve; });
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url) => {
      if (url.endsWith('/guest')) {
        guestCalls += 1;
        await guestReady;
        return new Response(null, { status: 204 });
      }
      return Response.json(savedSession());
    },
  }));

  const first = api.getSession(sessionId);
  const second = api.getSession(sessionId);
  releaseGuest();
  await Promise.all([first, second]);
  assert.equal(guestCalls, 1);
});

test('failed guest initialization is retryable and never sends session commands', async () => {
  let attempts = 0;
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url) => {
      assert.equal(url, '/api/v1/guest');
      attempts += 1;
      return Response.json({ code: 'UNAVAILABLE', message: 'Down' }, { status: 503 });
    },
  }));
  await assert.rejects(api.getSession(sessionId), { status: 503 });
  await assert.rejects(api.getSession(sessionId), { status: 503 });
  assert.equal(attempts, 2);
});

test('VERSION_CONFLICT exposes the backend code and does not silently replay', async () => {
  let calls = 0;
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url) => {
      if (url.endsWith('/guest')) {
        return new Response(null, { status: 204 });
      }
      calls += 1;
      return Response.json({ code: 'VERSION_CONFLICT', message: 'Stale version' }, { status: 409 });
    },
  }));

  await assert.rejects(api.prepareAdvance(sessionId, 1).execute(), (error) => {
    assert.equal(error.code, 'VERSION_CONFLICT');
    assert.equal(error.status, 409);
    return true;
  });
  assert.equal(calls, 1);
});

test('decoders accept nullable optional fields and reject invalid nested state', () => {
  const valid = savedSession();
  valid.character.background = { mother: null };
  valid.character.birthplace.region = null;
  assert.equal(decodeSession(valid), valid);
  assert.deepEqual(decodeSessionList([{
    id: sessionId, provider: 'local', name: 'Алекс', age: 0, status: 'ACTIVE', savedAt: valid.savedAt,
  }]).length, 1);

  for (const mutate of [
    (value) => { value.version = Number.MAX_SAFE_INTEGER + 1; },
    (value) => { value.state.stats.health = 101; },
    (value) => { value.state.age = 0.5; },
    (value) => { delete value.state.pendingDecision; },
    (value) => { value.character.birthplace.countryCode = 'CAN'; },
    (value) => { value.savedAt = 'yesterday'; },
    (value) => { value.state.status = 'UNKNOWN'; },
    (value) => { value.provider = 'UNKNOWN'; },
  ]) {
    const invalid = savedSession();
    mutate(invalid);
    assert.throws(() => decodeSession(invalid));
  }
});

test('generated session accepts missing birth city, null scores and an advanced age', () => {
  const generated = savedSession(7);
  generated.provider = '1in8b';
  generated.state.stats.appearance = null;
  generated.state.stats.aura = null;
  delete generated.character.birthplace.city;
  generated.character.background = null;
  assert.equal(decodeSession(generated), generated);
  assert.equal(decodeSessionList([{
    id: sessionId, provider: '1in8b', name: 'Алекс', age: 7,
    status: 'ACTIVE', savedAt: generated.savedAt,
  }])[0].provider, '1in8b');

  generated.state.stats.aura = -101;
  assert.throws(() => decodeSession(generated));
});

test('generation initializes guest and retries the same empty command with the same key', async () => {
  const calls = [];
  let attempts = 0;
  const generated = savedSession(5);
  generated.provider = '1in8b';
  generated.state.stats.appearance = null;
  generated.state.stats.aura = null;
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      calls.push({ url, method: options.method, body: options.body, key: options.headers.get('Idempotency-Key') });
      if (url.endsWith('/guest')) {
        return new Response(null, { status: 204 });
      }
      attempts += 1;
      if (attempts === 1) {
        throw new TypeError('Lost generation response');
      }
      return Response.json(generated, { status: 201 });
    },
  }));
  const command = api.prepareGenerateSession();
  await assert.rejects(command.execute(), { kind: 'network' });
  const saved = await command.execute();
  assert.equal(saved.state.age, 5);
  assert.equal(saved.provider, '1in8b');
  assert.deepEqual(calls.map(({ url }) => url), [
    '/api/v1/guest', '/api/v1/sessions/generated',
    '/api/v1/guest', '/api/v1/sessions/generated',
  ]);
  assert.equal(calls[1].body, '{}');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].key, calls[3].key);
});

test('character mapper preserves edited settings and requires explicit birth metadata', () => {
  const settings = {
    name: 'Мария', gender: 'Женщина', country: 'Канада', region: '', city: 'Оттава',
    family: 'Полная семья', siblings: 'Нет', pets: 'Нет', housing: 'Квартира',
    relationships: 'Тёплые', father: 'Механик', mother: 'Врач', wealth: 'Средний',
    religion: 'Нет', language: 'Французский',
  };
  const payload = toCreateSessionRequest(settings, startingStats, { countryCode: 'CA', birthYear: 2026 });
  assert.equal(payload.character.name, 'Мария');
  assert.equal(payload.character.background.language, 'Французский');
  assert.equal(payload.character.birthplace.countryCode, 'CA');
  assert.deepEqual(payload.startingStats, startingStats);
  assert.throws(() => toCreateSessionRequest(settings, startingStats, { countryCode: '', birthYear: 2026 }));
});

test('invalid command arguments fail before sending HTTP', () => {
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: () => assert.fail('No HTTP expected'),
  }));
  assert.throws(() => api.prepareAdvance('bad-id', 1));
  assert.throws(() => api.prepareAdvance(sessionId, 0));
  assert.throws(() => api.prepareAnswer(sessionId, 'toy', '', 1));
});

test('parameter view retains every field without inventing missing server values', () => {
  const saved = savedSession();
  saved.character.background = { mother: 'Врач', language: 'Французский' };
  delete saved.character.birthplace.city;
  saved.state.stats.appearance = null;
  const source = structuredClone(saved);
  const { settings, stats } = toCharacterParameters(saved);

  assert.equal(Object.keys(settings).length, 15);
  assert.equal(settings.name, 'Алекс');
  assert.equal(settings.mother, 'Врач');
  assert.equal(settings.language, 'Французский');
  assert.equal(settings.city, '');
  assert.equal(settings.father, '');
  assert.equal(stats.appearance, undefined);
  assert.equal(stats.health, 91);
  assert.deepEqual(saved, source);
});

test('character edits use PATCH and retain the same key and payload after a lost response', async () => {
  const calls = [];
  const saved = savedSession(2, 6);
  saved.provider = '1in8b';
  saved.character.name = 'Лина';
  saved.state.stats.appearance = 84;
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      if (url.endsWith('/guest')) {
        return new Response(null, { status: 204 });
      }
      calls.push({ url, method: options.method, body: options.body, key: options.headers.get('Idempotency-Key') });
      if (calls.length === 1) {
        throw new TypeError('Lost edit response');
      }
      return Response.json(saved);
    },
  }));
  const changes = { name: 'Лина', stats: { appearance: 84 } };
  const command = api.prepareEditCharacter(sessionId, 5, changes);
  changes.name = 'Другой персонаж';
  changes.stats.appearance = 10;

  await assert.rejects(command.execute(), { kind: 'network' });
  const result = await command.execute();
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].url, `/api/v1/sessions/${sessionId}/character`);
  assert.equal(calls[0].method, 'PATCH');
  assert.match(calls[0].key, /^[0-9a-f-]{36}$/);
  assert.deepEqual(JSON.parse(calls[0].body), {
    expectedVersion: 5, changes: { name: 'Лина', stats: { appearance: 84 } },
  });
  assert.equal(result.id, sessionId);
  assert.equal(result.version, 6);
  assert.equal(result.character.name, 'Лина');
  assert.equal(result.state.age, 2);
});

test('character edit mapper sends only changed fields supported by the provider', () => {
  const saved = savedSession();
  saved.provider = '1in8b';
  saved.state.stats.appearance = null;
  const { settings, stats } = toCharacterParameters(saved);
  assert.deepEqual(toCharacterChanges(saved, settings, stats), {});
  assert.deepEqual(toCharacterChanges(saved, { ...settings, name: ' Лина ', country: 'Япония' }, stats), {
    name: 'Лина',
  });
  assert.deepEqual(toCharacterChanges(saved, settings, { health: 0, intelligence: 0, appearance: 0 }), {
    stats: { appearance: 0 },
  });
  saved.provider = 'local';
  assert.deepEqual(toCharacterChanges(saved, settings, { health: 0, intelligence: 100, appearance: 84 }), {
    stats: { health: 0, intelligence: 100, appearance: 84 },
  });
});

test('invalid character changes fail before HTTP', () => {
  const api = createSessionsApi(createApiClient({
    baseUrl: '/api',
    fetcher: () => assert.fail('No HTTP expected'),
  }));
  for (const changes of [
    {}, { stats: {} }, { name: '' }, { name: '   ' }, { name: 'x'.repeat(101) },
    { stats: { health: 101 } }, { stats: { appearance: null } },
    { stats: { intelligence: 1.5 } }, { stats: { aura: 1 } }, { gender: 'Женщина' },
  ]) {
    assert.throws(() => api.prepareEditCharacter(sessionId, 1, changes));
  }
  assert.throws(() => api.prepareEditCharacter('bad-id', 1, { name: 'Лина' }));
  assert.throws(() => api.prepareEditCharacter(sessionId, 0, { name: 'Лина' }));
});
