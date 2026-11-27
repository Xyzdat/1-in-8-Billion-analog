import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';
import { getFamilyAppearance, withFamilySkin } from '../src/game/familyAppearance.ts';
import { resolveFamilySkinTones } from '../src/game/familySkin.ts';

let vite;
let initialSettings;
let initialStats;
before(async () => {
  vite = await createServer({
    cacheDir: 'node_modules/.vite-family-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
    ssr: { noExternal: ['react-country-flag'] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  });
  ({ initialSettings, initialStats } = await vite.ssrLoadModule('/src/mocks/mockData.ts'));
});
after(async () => { await vite?.close(); });

test('the server game replaces the old picture with the current family and preserves the session', async () => {
  const { default: Game } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const session = birthAndLifeSession();
  session.character.gender = 'Женщина';
  const original = structuredClone(session);
  const html = renderToStaticMarkup(createElement(Game, {
    server: { session, busy: false, failure: null, notice: '' }, onRestart() {},
  }));
  assert.match(html, /role="img" aria-label="Семья:/);
  assert.match(html, /data-person-id="relative:mother-custom-id"/);
  assert.doesNotMatch(html, /data-person-id="relative:father"|game-family\.png/);
  assert.match(html, /data-person-id="protagonist" data-sprite="girl-age-03"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Летопись жизни/);
  assert.deepEqual(session, original);
});

test('the mock game uses selected settings instead of a preassembled family picture', async () => {
  const { default: Game } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const html = renderToStaticMarkup(createElement(Game, {
    settings: { ...initialSettings, family: 'Две мамы', siblings: 'Две сестры' },
    stats: initialStats,
    onRestart() {},
  }));
  assert.equal((html.match(/data-sprite="adult-woman-/g) ?? []).length, 2);
  assert.equal((html.match(/data-sprite="girl-age-03"/g) ?? []).length, 2);
  assert.equal((html.match(/data-sprite="newborn"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-sprite="adult-man-/);
});

test('the game applies independent personal colors and restores exactly the same family SVG', async () => {
  const { default: Game } = await vite.ssrLoadModule('/src/components/gamePage/GamePage.tsx');
  const session = birthAndLifeSession();
  const original = structuredClone(session);
  const render = (saved) => renderToStaticMarkup(createElement(Game, {
    server: { session: saved, busy: false, failure: null, notice: '' }, onRestart() {},
  }));
  const html = render(session);
  const personId = 'relative:mother-custom-id';
  const skin = resolveFamilySkinTones([{ id: personId, parentIds: [] }], session.id, session.character.birthplace.countryCode)[personId];
  const profile = withFamilySkin(getFamilyAppearance(session.id, personId), skin);
  assert(html.includes(`data-appearance-id="${profile.id}"`));
  assert(html.includes(`fill="${profile.colors.skin}"`));
  assert(html.includes(`fill="${profile.colors.hair}"`));
  assert(html.includes(`fill="${profile.colors.shirt}"`));
  const scene = (markup) => markup.match(/<svg[^>]*role="img"[^>]*>[\s\S]*?<\/svg>/)[0];
  assert.equal(scene(render(JSON.parse(JSON.stringify(session)))), scene(html));
  assert.deepEqual(session, original);
});
