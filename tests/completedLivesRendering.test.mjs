import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { adultSession } from './fixtures/adultSession.mjs';

let vite;
before(async () => {
  vite = await createServer({
    cacheDir: 'node_modules/.vite-archive-tests', optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom',
  });
});
after(async () => { await vite?.close(); });

test('personal completed cards replace parallel lives and link to their exact saved session', async () => {
  const { default: Cards } = await vite.ssrLoadModule('/src/components/lifeCards/LifeCards.tsx');
  const session = adultSession();
  session.state.status = 'COMPLETE';
  const entry = { session, summary: {
    id: session.id, name: session.character.name, age: session.state.age,
    status: 'COMPLETE', provider: 'local', savedAt: session.savedAt,
  } };
  const html = renderToStaticMarkup(createElement(Cards, { entries: [entry] }));
  assert.match(html, /Прожитые жизни/);
  assert.match(html, /Акира/);
  assert.match(html, /2026 – 2061/);
  assert.match(html, /Япония/);
  assert.match(html, new RegExp(`href="#completed-life/${session.id}"`));
  assert.doesNotMatch(html, /Луиза|Параллельные жизни/);
  const empty = renderToStaticMarkup(createElement(Cards, { entries: [] }));
  assert.match(empty, /Параллельные жизни/);
  assert.match(empty, /Луиза/);
});

test('archive and game read the same saved favorite IDs without sharing favorites between lives', async () => {
  const { readLifeFavorites } = await vite.ssrLoadModule('/src/game/useLifeFavorites.ts');
  const saved = new Map([['life.favorites.first', '["event-1","event-1",42]'], ['life.favorites.bad', '{bad json']]);
  const storage = { getItem: (key) => saved.get(key) ?? null };
  assert.deepEqual(readLifeFavorites('first', storage), ['event-1']);
  assert.deepEqual(readLifeFavorites('second', storage), []);
  assert.deepEqual(readLifeFavorites('bad', storage), []);
  assert.deepEqual(readLifeFavorites('first', { getItem: () => { throw new Error('Blocked'); } }), []);
});
