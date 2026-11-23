import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api/client.ts';
import { ApiError } from '../src/api/errors.ts';

function decodeState(data) {
  if (!data || typeof data.age !== 'number') {
    throw new Error('Invalid state');
  }
  return data;
}

test('API sends JSON through the configured base and returns validated state', async () => {
  let captured;
  const client = createApiClient({
    baseUrl: '/api/',
    fetcher: async (url, options) => {
      captured = { url, options };
      return Response.json({ age: 0 });
    },
  });
  const result = await client.request('/sessions', {
    method: 'POST',
    body: { name: 'Юи' },
    headers: { 'Idempotency-Key': 'action-1' },
    decode: decodeState,
  });

  assert.equal(result.age, 0);
  assert.equal(captured.url, '/api/sessions');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.body, '{"name":"Юи"}');
  assert.equal(captured.options.credentials, 'same-origin');
  assert.equal(captured.options.cache, 'no-store');
  assert.equal(captured.options.headers.get('Content-Type'), 'application/json');
  assert.equal(captured.options.headers.get('Accept'), 'application/json');
  assert.equal(captured.options.headers.get('Idempotency-Key'), 'action-1');
});

test('GET does not add a body or Content-Type; supports encoded query values', async () => {
  const client = createApiClient({
    baseUrl: '/api',
    fetcher: async (url, options) => {
      assert.equal(url, '/api/sessions?search=a%2Fb');
      assert.equal(options.body, undefined);
      assert.equal(options.headers.has('Content-Type'), false);
      return Response.json({ age: 2 });
    },
  });

  await client.request('/sessions?search=a%2Fb', { decode: decodeState });
});

test('HTTP errors retain status and structured details without automatic retries', async () => {
  for (const status of [400, 401, 403, 409, 429, 500]) {
    let calls = 0;
    const client = createApiClient({
      baseUrl: '/api',
      fetcher: async () => {
        calls += 1;
        return Response.json({ code: 'example' }, { status });
      },
    });

    await assert.rejects(client.request('/sessions', { decode: decodeState }), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.kind, 'http');
      assert.equal(error.status, status);
      assert.deepEqual(error.details, { code: 'example' });
      return true;
    });
    assert.equal(calls, 1);
  }
});

test('HTML from a failing proxy preserves the HTTP error', async () => {
  const client = createApiClient({
    baseUrl: '/api',
    fetcher: async () => new Response('<html>Unavailable</html>', { status: 502 }),
  });

  await assert.rejects(client.request('/sessions', { decode: decodeState }), {
    kind: 'http',
    status: 502,
  });
});

test('invalid JSON and unexpected response shapes are rejected', async () => {
  for (const body of ['<html>Frontend fallback</html>', '{', '{"age":"nine"}']) {
    const client = createApiClient({
      baseUrl: '/api',
      fetcher: async () => new Response(body),
    });

    await assert.rejects(client.request('/sessions', { decode: decodeState }), {
      kind: 'invalid-response',
    });
  }
});

test('204 can be decoded as an empty result', async () => {
  const client = createApiClient({
    baseUrl: '/api',
    fetcher: async () => new Response(null, { status: 204 }),
  });

  await client.request('/sessions/1', {
    method: 'DELETE',
    decode: (data) => assert.equal(data, undefined),
  });
});

test('network failures are reported without retrying the mutation', async () => {
  let calls = 0;
  const client = createApiClient({
    baseUrl: '/api',
    fetcher: async () => {
      calls += 1;
      throw new TypeError('Failed to fetch');
    },
  });

  await assert.rejects(client.request('/purchases', {
    method: 'POST',
    body: { itemId: 'bicycle' },
    decode: decodeState,
  }), { kind: 'network' });
  assert.equal(calls, 1);
});

function waitForAbort(_url, { signal }) {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

test('timeout aborts the underlying request', async () => {
  const client = createApiClient({
    baseUrl: '/api',
    timeoutMs: 20,
    fetcher: waitForAbort,
  });

  await assert.rejects(client.request('/sessions', { decode: decodeState }), {
    kind: 'timeout',
  });
});

test('component cancellation preserves AbortError rather than a network error', async () => {
  const controller = new AbortController();
  const client = createApiClient({ baseUrl: '/api', fetcher: waitForAbort });
  const request = client.request('/sessions', {
    signal: controller.signal,
    decode: decodeState,
  });
  controller.abort();

  await assert.rejects(request, { name: 'AbortError' });
});

test('already cancelled requests do not call fetch', async () => {
  const controller = new AbortController();
  controller.abort();
  const client = createApiClient({
    baseUrl: '/api',
    fetcher: () => assert.fail('Fetch must not run'),
  });

  await assert.rejects(client.request('/sessions', {
    signal: controller.signal,
    decode: decodeState,
  }), { name: 'AbortError' });
});

test('external URLs and paths escaping the API prefix are rejected', async () => {
  const client = createApiClient({
    baseUrl: '/api',
    fetcher: () => assert.fail('Fetch must not run'),
  });

  for (const path of ['https://other.test', '//other.test', '/../admin', '/%2e%2e/admin', '/x\\y']) {
    await assert.rejects(client.request(path, { decode: decodeState }));
  }
  await assert.rejects(client.request('/sessions', {
    body: {},
    decode: decodeState,
  }));
});
