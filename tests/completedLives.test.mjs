import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adultSession, adultFinances } from './fixtures/adultSession.mjs';
import { completedLifeId, completedLifePrefix, completedLifeSummary, loadCompletedLives } from '../src/game/completedLives.ts';

const id = adultSession().id;

test('completed-life URLs restore a specific UUID and reject invalid routes', () => {
  assert.equal(completedLifeId(`${completedLifePrefix}${id}`), id);
  for (const hash of ['', '#server-life', '#completed-life/bad', `${completedLifePrefix}${id}/step`, `${completedLifePrefix}${id}?other`]) {
    assert.equal(completedLifeId(hash), null);
  }
});

test('archive summaries use actual final family, money location, career and aura without changing the snapshot', () => {
  const session = adultSession();
  session.state.status = 'COMPLETE';
  const finances = adultFinances();
  finances.location = { countryCode: 'GE', country: 'Грузия', city: 'Тбилиси' };
  session.state.stats.aura = 0;
  session.simulation.adult.career.history.push({
    id: 'earlier', occupation: 'Художник', employer: '', beganMonth: 100, endedMonth: 300, endReason: 'CHANGE',
  });
  const before = structuredClone(session);
  const report = completedLifeSummary(session, finances);
  assert.equal(report.name, session.character.name);
  assert.equal(report.years, '2026 – 2061');
  assert.equal(report.family, 'Дети: 1, Внуки: 1, Правнуки: 1');
  assert.equal(report.home, 'Тбилиси, Грузия');
  assert.equal(report.occupation, 'Художник');
  assert.equal(report.aura, '0');
  assert.deepEqual(session, before);
});

test('missing legacy/provider data stays unknown, and infant ages preserve actual months', () => {
  const session = adultSession();
  delete session.simulation;
  session.provider = '1in8b';
  session.state.age = 82;
  session.state.stats.aura = null;
  let report = completedLifeSummary(session, null);
  assert.equal(report.age, '82 года');
  assert.equal(report.years, '2026 – 2108');
  assert.equal(report.family, 'Нет данных');
  assert.equal(report.home, 'Нет данных');
  assert.equal(report.occupation, 'Нет данных');
  assert.equal(report.aura, 'Нет данных');
  assert.doesNotMatch(report.birthplace, /остал|конца/);
  const infant = adultSession();
  infant.state.age = 0;
  infant.simulation.death = { elapsedMonths: 11, age: 0, cause: 'UNSPECIFIED', model: 'UN_WPP_2024_QX', note: '' };
  report = completedLifeSummary(infant, null);
  assert.equal(report.age, '0 лет, 11 мес.');
});

test('home archive lists only completed lives, bounds concurrent reads and keeps failed cards', async () => {
  const rows = Array.from({ length: 10 }, (_, index) => ({
    id: `record-${index}`, name: `Жизнь ${index}`, age: index,
    status: index === 0 ? 'ACTIVE' : 'COMPLETE', provider: 'local', savedAt: '2026-11-25T09:00:00Z',
  }));
  let active = 0;
  let maximum = 0;
  let published;
  const calls = [];
  const api = {
    listSessions: async () => rows,
    getSession: async (id) => {
      calls.push(id);
      active += 1;
      maximum = Math.max(maximum, active);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (id === 'record-3') throw new Error('Unavailable');
        return { ...adultSession(), id, state: { ...adultSession().state, status: 'COMPLETE' } };
      } finally {
        active -= 1;
      }
    },
  };
  const entries = await loadCompletedLives(api, new AbortController().signal, (list) => { published = list; });
  assert.equal(entries.length, 9);
  assert(maximum <= 4);
  assert(!calls.includes('record-0'));
  assert.equal(entries[2].session, null);
  assert.deepEqual(entries.map((entry) => entry.summary.id), rows.slice(1).map((row) => row.id));
  assert(published.every((entry) => entry.session === null), 'Published state must not be mutated by background reads');
});

test('empty archives do not read character snapshots and cancellation stops outstanding work', async () => {
  const api = { listSessions: async () => [], getSession: async () => { throw new Error('Unexpected read'); } };
  assert.deepEqual(await loadCompletedLives(api, new AbortController().signal), []);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadCompletedLives(api, controller.signal), { name: 'AbortError' });
});
