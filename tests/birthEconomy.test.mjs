import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeSession } from '../src/api/sessionDecoders.ts';
import { toGeneratedBirthCard } from '../src/api/birthDetailsMapper.ts';
import { toCharacterParameters, toCharacterChanges } from '../src/api/characterMapper.ts';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';

function newborn() {
  const session = birthAndLifeSession();
  session.state.age = 0;
  session.simulation.elapsedMonths = 0;
  session.simulation.monthOfYear = 0;
  session.simulation.family[1].alive = true;
  session.character.birthDetails.father.alive = true;
  return session;
}

test('wealth descriptions preserve the complete server value, index and game estimate without currency or extra rank', () => {
  for (const [value, basis] of [
    ['Низкий достаток · 0,39 среднего по стране', 'SAMPLED_PROXY'],
    ['Ниже среднего · 0,555 среднего по стране', 'SAMPLED_PROXY'],
    ['Выше среднего · игровая оценка', 'GAME_ASSUMPTION'],
    ['Пользовательский достаток · исходная оценка сохранена', 'GAME_ASSUMPTION'],
  ]) {
    const session = newborn();
    session.character.background.wealth = 'Старое короткое описание';
    Object.assign(session.character.birthFacts.wealth, { value, basis });
    const original = structuredClone(session);
    const card = toGeneratedBirthCard(decodeSession(session));
    assert.equal(card.wealth, value);
    assert.equal(card.familyDetails.find((row) => row.label === 'Достаток').value, value);
    assert.equal(toCharacterParameters(session).settings.wealth, value);
    assert.doesNotMatch(card.wealth, /₽|\$|USD|ППС|из 5/);
    assert.deepEqual(session, original);
  }
});

test('restoring and editing another parameter do not replace wealth with a client quintile label', () => {
  const session = newborn();
  session.character.birthFacts.wealth.value = 'Высокий достаток · 2,57 среднего по стране';
  const restored = decodeSession(JSON.parse(JSON.stringify(session)));
  const { settings, stats } = toCharacterParameters(restored);
  assert.equal(settings.wealth, session.character.birthFacts.wealth.value);
  assert.deepEqual(toCharacterChanges(restored, settings, stats), {});
  assert.deepEqual(toCharacterChanges(restored, { ...settings, name: 'Новое имя' }, stats), { name: 'Новое имя' });
  assert.deepEqual(toGeneratedBirthCard(restored), toGeneratedBirthCard(session));
  restored.simulation.elapsedMonths = 2;
  assert.equal(toCharacterParameters(restored).settings.wealth, session.character.birthFacts.wealth.value);
});

test('broad parent profession labels are retained verbatim instead of a narrow fallback or raw code', () => {
  const session = newborn();
  const motherLabel = 'Специалист среднего уровня квалификации';
  const fatherLabel = 'Сфера работы не указана';
  session.character.birthDetails.mother.occupation = { code: 'OCU_ISCO08_3', label: motherLabel };
  session.character.birthDetails.father.occupation = { code: 'OCU_ISCO88_X', label: fatherLabel };
  session.simulation.family[0].occupation = motherLabel;
  session.simulation.family[1].occupation = fatherLabel;
  session.character.background.mother = 'Эми, Врач';
  session.character.background.father = 'Кэн, Инженер';
  const original = structuredClone(session);
  const card = toGeneratedBirthCard(decodeSession(session));
  assert.equal(card.members.find((person) => person.kind === 'mother').description, motherLabel);
  assert.equal(card.members.find((person) => person.kind === 'father').description, fatherLabel);
  const { settings } = toCharacterParameters(session);
  assert.equal(settings.mother, motherLabel);
  assert.equal(settings.father, fatherLabel);
  assert.deepEqual(session, original);
});

test('unknown profession and absent parent remain distinct, including null labels and arbitrary family IDs', () => {
  const session = newborn();
  session.character.birthDetails.mother.occupation = { code: 'UNSPECIFIED', label: 'Нет данных о профессии' };
  session.simulation.family[0].occupation = 'Нет данных о профессии';
  session.character.birthDetails.father = null;
  session.character.birthDetails.familyType = null;
  session.character.birthDetails.fatherPresent = false;
  session.character.background.father = null;
  session.simulation.family = session.simulation.family.filter((member) => member.role !== 'father');
  const card = toGeneratedBirthCard(decodeSession(session));
  assert.equal(card.members.find((person) => person.kind === 'mother').description, 'Нет данных о профессии');
  assert(!card.members.some((person) => person.kind === 'father'));
  const { settings } = toCharacterParameters(session);
  assert.equal(settings.mother, 'Нет данных о профессии');
  assert.equal(settings.father, '');
  session.character.birthDetails.mother.occupation.label = null;
  assert.equal(toGeneratedBirthCard(session).members[0].description, 'Нет данных о профессии');
  assert.equal(toCharacterParameters(session).settings.mother, 'Нет данных о профессии');
});

test('old saves retain their own wealth and occupation text and use rank only when no description exists', () => {
  const session = birthAndLifeSession();
  session.simulation = null;
  session.character.birthFacts = null;
  session.character.birthDetails = null;
  session.character.background = { wealth: 'Скромный достаток старого сохранения', mother: 'Учитель', father: null };
  const original = structuredClone(session);
  const card = toGeneratedBirthCard(decodeSession(session));
  assert.equal(card.wealth, session.character.background.wealth);
  assert.equal(card.members[0].description, 'Учитель');
  assert.equal(card.members.length, 1);
  assert.equal(toCharacterParameters(session).settings.wealth, session.character.background.wealth);
  assert.deepEqual(session, original);
  session.character.background.wealth = null;
  session.character.birthDetails = { familyIncomeQuintile: 2 };
  assert.equal(toGeneratedBirthCard(session).wealth, '2 из 5');
});
