import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { toCharacterParameters } from '../src/api/characterMapper.ts';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';

let vite;
before(async () => {
  vite = await createServer({
    cacheDir: 'node_modules/.vite-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  });
});
after(async () => { await vite?.close(); });

test('existing editor enables server birth controls before the first step and keeps unsupported pets read-only', async () => {
  const { default: Editor } = await vite.ssrLoadModule('/src/components/changeParametersPage/changeParametersPage.tsx');
  const session = birthAndLifeSession();
  session.state.age = 0;
  session.simulation.elapsedMonths = 0;
  const render = () => {
    const { settings, stats } = toCharacterParameters(session);
    return renderToStaticMarkup(createElement(Editor, {
      values: settings, statValues: stats, onBack() {}, onApply() {},
      server: { session, busy: false, failure: null, notice: '', onSave() {} },
    }));
  };
  const row = (html, label) => html.match(new RegExp(`<button[^>]*><span>${label}</span>.*?</button>`))?.[0];
  const html = render();
  for (const label of ['Имя', 'Пол', 'Страна', 'Регион', 'Город', 'Состав семьи', 'Братья и сёстры', 'Жильё', 'Отношения в семье', 'Профессия матери', 'Достаток', 'Религия', 'Язык в семье']) {
    assert(row(html, label), label);
    assert.doesNotMatch(row(html, label), /disabled/);
  }
  assert.match(row(html, 'Домашние животные'), /disabled/);
  assert.doesNotMatch(html, /Год рождения|Счастье|Аура|Доверие/);
  session.simulation.elapsedMonths = 2;
  const started = render();
  assert.match(row(started, 'Страна'), /disabled/);
  assert.match(row(started, 'Состав семьи'), /disabled/);
  assert.doesNotMatch(row(started, 'Имя'), /disabled/);
  session.provider = '1in8b';
  const external = render();
  assert.match(external, /Можно изменить имя и внешность/);
  assert.match(external.match(/<input[^>]*aria-label="Здоровье"[^>]*>/)?.[0] ?? '', /disabled/);
});
