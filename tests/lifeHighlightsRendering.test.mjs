import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { highlightsSession } from './fixtures/highlightsSession.mjs';
import { adultFinances } from './fixtures/adultSession.mjs';

let vite;
before(async () => {
  vite = await createServer({
    cacheDir: 'node_modules/.vite-highlights-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  });
});
after(async () => { await vite?.close(); });

test('death introduction uses actual death cause and current home, without inventing last words or death in the birth city', async () => {
  const { default: Intro } = await vite.ssrLoadModule('/src/components/lifeSlideshow/DeathIntro.tsx');
  const session = highlightsSession();
  const finances = adultFinances();
  finances.location = { countryCode: 'GE', country: 'Грузия', city: 'Тбилиси' };
  const html = renderToStaticMarkup(createElement(Intro, { session, finances }));
  assert.match(html, /возраст 35/);
  assert.match(html, /Причина смерти · Инсульт/);
  assert.match(html, /Грузия, Тбилиси/);
  assert.doesNotMatch(html, /Япония|Жизнь была хорошей|Игровая модель/);
  finances.version -= 1;
  const stale = renderToStaticMarkup(createElement(Intro, { session, finances }));
  assert.doesNotMatch(stale, /Тбилиси|Япония/);
});

test('slide renders server decisions and evidence as text, without mock images, scores or assumed causality', async () => {
  const { default: Slide } = await vite.ssrLoadModule('/src/components/lifeSlideshow/HighlightSlide.tsx');
  const session = highlightsSession();
  const before = structuredClone(session);
  const html = renderToStaticMarkup(createElement(Slide, { slide: session.highlights.slides[0] }));
  assert.match(html, /6 лет/);
  assert.match(html, /Сохранённая глава 6/);
  assert.match(html, /Реальный ответ 0 — 1 500 ₽/);
  assert.match(html, /Подтверждённый результат 0/);
  assert.match(html, /Дальнейшая судьба этой главы 0/);
  assert.doesNotMatch(html, /<img|importance|TRACKED_ENTITY|баллов|привело к/);
  assert.deepEqual(session, before);
});
