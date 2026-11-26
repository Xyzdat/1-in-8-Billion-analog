import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { toServerDecision } from '../src/game/serverPresentation.ts';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';

const decision = () => ({
  id: 'education-choice', title: 'Продолжить учёбу?',
  options: [{ id: 'work', label: 'Начать работать сразу' }, { id: 'study', label: 'Поступить в вуз' }],
});

test('decision metadata accepts old, missing, nullable and explicitly false fields and rejects invalid types', () => {
  const session = birthAndLifeSession();
  for (const metadata of [{}, { important: true, description: 'Ты окончил школу.' }, { important: false }, { important: null, description: null }]) {
    session.state.pendingDecision = { ...decision(), ...metadata };
    session.state.pendingDecision.options[0].description = 'Сразу доход';
    assert.equal(decodeSession(session), session);
    session.state.pendingDecision.options[0].description = null;
    assert.equal(decodeSession(session), session);
  }
  for (const mutate of [
    (d) => { d.important = 'true'; },
    (d) => { d.important = 100; },
    (d) => { d.description = {}; },
    (d) => { d.options[0].description = 10; },
  ]) {
    session.state.pendingDecision = decision();
    mutate(session.state.pendingDecision);
    assert.throws(() => decodeSession(session));
  }
});

test('local decisions use the server offer text by exact event ID without guessing importance', () => {
  const pending = decision();
  const history = [
    { id: pending.id, age: 18, title: pending.title, text: 'Ты окончил базовое образование.' },
    { id: 'another-question', age: 18, title: pending.title, text: 'Описание другого вопроса.' },
  ];
  const before = structuredClone({ pending, history });
  const presented = toServerDecision(pending, history);
  assert.equal(presented.text, 'Ты окончил базовое образование.');
  assert.equal(presented.important, false);
  assert.deepEqual(presented.options.map((option) => option.id), ['work', 'study']);
  assert.deepEqual({ pending, history }, before);
});

test('adult decisions use an explicit OFFER link instead of a later outcome or a matching title', () => {
  const pending = decision();
  const history = [
    { id: 'offer-event', age: 18, title: 'Новый этап', text: 'Подумай о дальнейшем обучении.', link: { phase: 'OFFER', decisionId: pending.id } },
    { id: 'result-event', age: 18, title: pending.title, text: 'Это результат другого этапа.', link: { phase: 'OUTCOME', decisionId: pending.id } },
  ];
  assert.equal(toServerDecision(pending, history).text, 'Подумай о дальнейшем обучении.');
  assert.equal(toServerDecision(pending, [history[1]]).text, undefined);
});

test('explicit importance and descriptions are preserved across restore and take precedence over history', () => {
  const session = birthAndLifeSession();
  session.state.pendingDecision = {
    ...decision(), important: true, description: '  Несколько друзей уже начали работать.  ',
  };
  session.state.pendingDecision.options[0].description = ' Сразу доход ';
  session.state.history.push({ id: 'education-choice', age: 18, title: 'Учёба', text: 'Старое описание' });
  const before = structuredClone(session);
  const restored = decodeSession(JSON.parse(JSON.stringify(session)));
  const presented = toServerDecision(restored.state.pendingDecision, restored.state.history);
  assert.equal(presented.important, true);
  assert.equal(presented.text, 'Несколько друзей уже начали работать.');
  assert.equal(presented.options[0].description, 'Сразу доход');
  assert.equal(presented.options[1].description, undefined);
  assert.deepEqual(session, before);
});

test('ordinary and old decisions keep no badge and do not invent an absent description', () => {
  for (const important of [undefined, false, null]) {
    const presented = toServerDecision({ ...decision(), important }, []);
    assert.equal(presented.important, false);
    assert.equal(presented.text, undefined);
  }
});

test('option effects accept optional, nullable and nested zero values and reject invalid preview values', () => {
  const session = birthAndLifeSession();
  session.state.pendingDecision = decision();
  const option = session.state.pendingDecision.options[0];
  for (const effects of [
    undefined, null,
    { scope: 'IMMEDIATE', stats: {}, closeness: {} },
    { scope: 'IMMEDIATE', stats: { health: 0, happiness: 1, aura: -5 }, closeness: { father: -2 } },
  ]) {
    option.effects = effects;
    assert.equal(decodeSession(session), session);
  }
  for (const effects of [
    [], 1, {}, { health: 1 },
    { scope: 'LATER', stats: {}, closeness: {} },
    { scope: 'IMMEDIATE', stats: { intelligence: 1.5 }, closeness: {} },
    { scope: 'IMMEDIATE', stats: { appearance: null }, closeness: {} },
    { scope: 'IMMEDIATE', stats: { aura: Infinity }, closeness: {} },
  ]) {
    option.effects = effects;
    assert.throws(() => decodeSession(session));
  }
});

test('each option retains its own effect preview and ID after restoration without applying effects to current stats', () => {
  const session = birthAndLifeSession();
  session.state.pendingDecision = {
    ...decision(),
    options: [
      { id: 'drawing', label: 'Рисование', effects: { scope: 'IMMEDIATE', stats: { happiness: 1, intelligence: 1 }, closeness: {} } },
      { id: 'swimming', label: 'Плавание', effects: { scope: 'IMMEDIATE', stats: { health: 2, relationships: -1 }, closeness: {} } },
      { id: 'workshop', label: 'Мастерская с папой', effects: { scope: 'IMMEDIATE', stats: { intelligence: 1, relationships: 2, aura: 1 }, closeness: { father: 1 } } },
      { id: 'keep', label: 'Остаться при нынешних увлечениях' },
    ],
  };
  const before = structuredClone(session);
  const restored = decodeSession(JSON.parse(JSON.stringify(session)));
  const presented = toServerDecision(restored.state.pendingDecision, restored.state.history);
  assert.deepEqual(presented.options.map(({ id }) => id), ['drawing', 'swimming', 'workshop', 'keep']);
  assert.deepEqual(presented.options.map(({ changes }) => changes), [
    { happiness: 1, intelligence: 1 }, { health: 2, relationships: -1 },
    { intelligence: 1, relationships: 2, aura: 1 }, undefined,
  ]);
  assert.deepEqual(session, before);
  assert.deepEqual(restored.state.stats, before.state.stats);
  presented.options[0].changes.intelligence = 99;
  presented.options[2].closeness.father = 99;
  assert.equal(restored.state.pendingDecision.options[0].effects.stats.intelligence, 1, 'UI data must not alter the server snapshot');
  assert.equal(restored.state.pendingDecision.options[2].effects.closeness.father, 1);
});
