import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceTime, advanceUntilDecision, buyItem, END_MS, getSnapshot, nextDecision, YEAR_MS } from '../src/game/simulation.ts';
import { getShopItems, shopSections } from '../src/mocks/spendingCatalog.ts';
import { decisions } from '../src/mocks/gameChoices.ts';
import { lifeEvents } from '../src/mocks/lifeEvents.ts';
import { getFinances } from '../src/game/finances.ts';

const initial = { health: 91, happiness: 80, intelligence: 72, relationships: 90 };

test('one year at 1x, 2x and 4x uses actual elapsed milliseconds', () => {
  for (const speed of [1, 2, 4, 8, 16]) {
    assert.equal(advanceTime(0, YEAR_MS / speed, speed, false), YEAR_MS);
  }
});

test('pause and speed switches preserve elapsed progress', () => {
  let elapsed = advanceTime(0, 10_000, 1, false);
  elapsed = advanceTime(elapsed, 50_000, 16, true);
  assert.equal(elapsed, 10_000);
  elapsed = advanceTime(elapsed, 10_000, 2, false);
  assert.equal(elapsed, 30_000);
  assert.equal(advanceTime(elapsed, 7_500, 4, false), YEAR_MS);
});

test('events are deterministic, ordered and applied exactly once', () => {
  assert.equal(getSnapshot(0, initial).events.length, 1);
  const snapshot = getSnapshot(2 * YEAR_MS, initial);
  assert.deepEqual(snapshot.events.map((event) => event.id), ['birth', 'smile', 'toy', 'steps', 'family-1', 'words']);
  assert.equal(snapshot.stats.health, 93);
  assert.equal(snapshot.stats.intelligence, 76);
  assert.deepEqual(getSnapshot(2 * YEAR_MS, initial), snapshot);
  assert.equal(initial.health, 91);
});

test('22 years caps time, includes final event and clamps characteristics', () => {
  const elapsed = advanceTime(END_MS - 10, 100_000, 16, false);
  const snapshot = getSnapshot(elapsed, { ...initial, intelligence: 99 });
  assert.equal(elapsed, END_MS);
  assert.equal(snapshot.age, 22);
  assert.equal(snapshot.complete, true);
  assert.equal(snapshot.events.some((event) => event.id === 'twenty-two'), true);
  assert.equal(snapshot.stats.intelligence, 100);
  assert.equal(new Set(snapshot.events.map((event) => event.id)).size, snapshot.events.length);
});

test('every year to 22 has a deterministic main story event', () => {
  for (let age = 0; age <= 22; age++) {
    assert.ok(lifeEvents.some((event) => event.age === age), `Missing year ${age}`);
  }
});

test('personal closeness changes independently and is bounded', () => {
  const baseline = getSnapshot(13 * YEAR_MS, initial);
  const honest = getSnapshot(13 * YEAR_MS, initial, { answers: { 'broken-cup': 0 }, focus: {} });
  const dishonest = getSnapshot(13 * YEAR_MS, initial, { answers: { 'broken-cup': 2 }, focus: {} });
  assert.ok(honest.closeness.mother > baseline.closeness.mother);
  assert.ok(dishonest.closeness.brother < baseline.closeness.brother);
  assert.equal(honest.closeness.friend, baseline.closeness.friend);
  for (const value of Object.values(honest.closeness)) assert.ok(value >= 0 && value <= 100);
});

test('monthly money accrues once and choices affect both finances and family', () => {
  const baseline = getSnapshot(17 * YEAR_MS, initial);
  const helping = getSnapshot(17 * YEAR_MS, initial, { answers: { 'first-pay': 0 }, focus: {} });
  assert.equal(baseline.finances.savings - helping.finances.savings, 5000);
  assert.ok(helping.closeness.mother > baseline.closeness.mother);
  assert.equal(helping.finances.ledger.filter((entry) => entry.id === 'first-pay').length, 1);
  assert.deepEqual(getSnapshot(17 * YEAR_MS, initial, { answers: { 'first-pay': 0 }, focus: {} }), helping);
});

test('career choice changes subsequent monthly rates, without rewriting past months', () => {
  const work = getSnapshot(19 * YEAR_MS, initial, { answers: { 'education-path': 0 }, focus: {} });
  const university = getSnapshot(19 * YEAR_MS, initial, { answers: { 'education-path': 1 }, focus: {} });
  assert.equal(work.finances.income, 365400);
  assert.equal(university.finances.income, 180000);
  assert.equal(work.finances.expenses, 252108);
  assert.deepEqual(work.finances.ledger.filter((entry) => entry.age <= 18), university.finances.ledger.filter((entry) => entry.age <= 18));
});

test('money ledger balances savings and debt and includes one-off income/expense', () => {
  const choices = { answers: Object.fromEntries(decisions.map((decision) => [decision.id, 0])), focus: {} };
  const result = getSnapshot(END_MS, initial, choices);
  const balance = result.finances.ledger.reduce((sum, entry) => sum + entry.income - entry.expenses, 0);
  assert.ok(Math.abs(result.finances.savings - result.finances.debt - balance) < 0.01);
  assert.equal(result.finances.ledger.filter((entry) => entry.id === 'bonus').length, 1);
  assert.equal(result.finances.ledger.find((entry) => entry.id === 'bonus').income, 15000);
  const debt = getFinances(0, [{ id: 'debt', age: 0, title: 'Расход', text: '', changes: {}, money: { expenses: 100 } }]);
  assert.equal(debt.savings, 0);
  assert.equal(debt.debt, 100);
});

test('large time jumps stop at every unanswered decision, and pause holds everything', () => {
  const choices = { answers: {}, focus: {} };
  let elapsed = 0;
  let count = 0;
  while (elapsed < END_MS) {
    const result = advanceUntilDecision(elapsed, END_MS, 16, false, choices);
    elapsed = result.elapsed;
    if (result.decision) {
      assert.equal(elapsed, result.decision.age * YEAR_MS);
      const frozen = advanceUntilDecision(elapsed, 100000, 16, true, choices);
      assert.equal(frozen.elapsed, elapsed);
      choices.answers[result.decision.id] = 0;
      count++;
    }
    assert.ok(count <= decisions.length);
  }
  assert.equal(count, decisions.length);
  const final = getSnapshot(elapsed, initial, choices);
  assert.equal(final.complete, true);
  assert.equal(new Set(final.events.map((event) => event.id)).size, final.events.length);
});

test('every answer branch produces finite finances, bounded stats and one result event', () => {
  for (const decision of decisions) {
    for (let index = 0; index < decision.options.length; index++) {
      const choices = { answers: { [decision.id]: index }, focus: {} };
      const snapshot = getSnapshot(END_MS, initial, choices);
      assert.equal(snapshot.events.filter((event) => event.id === decision.id).length, 1);
      for (const value of Object.values(snapshot.stats)) assert.ok(value >= 0 && value <= 100);
      for (const value of Object.values(snapshot.closeness)) assert.ok(value >= 0 && value <= 100);
      assert.ok(Number.isFinite(snapshot.finances.savings));
      assert.ok(Number.isFinite(snapshot.finances.debt));
      assert.equal(new Set(snapshot.finances.ledger.map((entry) => entry.id)).size, snapshot.finances.ledger.length);
    }
  }
});

test('deferred adult career changes rates only after the actual decision', () => {
  const choices = { answers: { 'education-path': 0 }, focus: {}, deferred: { 'education-path': 18.25 } };
  const snapshot = getSnapshot(19 * YEAR_MS, initial, choices);
  assert.equal(snapshot.finances.income, 3 * (96000 / 12) + 9 * (365400 / 12));
});

test('pause preserves all domains and a fresh run resets finances and decisions', () => {
  const choices = { answers: Object.fromEntries(decisions.map((decision) => [decision.id, 0])), focus: {} };
  const before = getSnapshot(20 * YEAR_MS, initial, choices);
  const frozen = advanceUntilDecision(20 * YEAR_MS, 50000, 16, true, choices);
  assert.deepEqual(getSnapshot(frozen.elapsed, initial, choices), before);
  const fresh = getSnapshot(0, initial);
  assert.equal(fresh.finances.savings, 0);
  assert.equal(fresh.finances.ledger.length, 0);
  assert.equal(fresh.events.length, 1);
  assert.equal(fresh.closeness.mother, 94);
});

test('decisions apply effects once and aura follows the chosen action', () => {
  const choices = { answers: { 'toy-choice': 0 }, focus: {} };
  const result = getSnapshot(4 * YEAR_MS, initial, choices);
  assert.equal(result.events.filter((event) => event.id === 'toy-choice').length, 1);
  assert.equal(result.aura, 3);
  assert.equal(getSnapshot(4 * YEAR_MS, initial, { answers: { 'toy-choice': 2 }, focus: {} }).aura, -3);
  assert.equal(nextDecision(4 * YEAR_MS, {})?.id, 'toy-choice');
  assert.equal(nextDecision(4 * YEAR_MS, choices.answers), undefined);
  assert.deepEqual(getSnapshot(4 * YEAR_MS, initial, choices), result);
});

test('focus rewards only a completed year and preserves previous focus', () => {
  const choices = { answers: {}, focus: { 3: 'learning', 4: 'health' } };
  assert.equal(getSnapshot(3.9 * YEAR_MS, initial, choices).events.some((event) => event.id === 'focus-3'), false);
  const result = getSnapshot(5 * YEAR_MS, initial, choices);
  assert.equal(result.events.find((event) => event.id === 'focus-3').changes.intelligence, 3);
  assert.equal(result.events.find((event) => event.id === 'focus-4').changes.health, 3);
});

test('deferred decisions return at the new age and record that age once answered', () => {
  const answers = { 'toy-choice': 0 };
  const deferred = { bullying: 6.75 };
  assert.equal(nextDecision(6.5 * YEAR_MS, answers, deferred), undefined);
  assert.equal(nextDecision(6.75 * YEAR_MS, answers, deferred)?.id, 'bullying');
  const snapshot = getSnapshot(7 * YEAR_MS, initial, { answers: { ...answers, bullying: 0 }, focus: {}, deferred });
  assert.equal(snapshot.events.find((event) => event.id === 'bullying').age, 6.75);
});

test('after-school decision is available at nine and records the selected consequences', () => {
  const answers = { 'toy-choice': 0, bullying: 0, 'lost-pencil': 0, promise: 0 };
  assert.equal(nextDecision(END_MS, answers)?.id, 'after-school');
  const result = getSnapshot(END_MS, initial, { answers: { ...answers, 'after-school': 1 }, focus: {} });
  assert.equal(result.events.find((event) => event.id === 'after-school').changes.health, 3);
});

function fundedChoices() {
  return { answers: Object.fromEntries(decisions.map((decision) => [decision.id, 0])), focus: {} };
}

function purchase(section, itemId, overrides = {}) {
  return { id: `test-${section}-${itemId}`, section, itemId, country: 'Япония', age: 20, ...overrides };
}

test('purchase immediately reduces balance and records exactly one expense and life event', () => {
  const before = fundedChoices();
  const result = buyItem(20 * YEAR_MS, initial, before, purchase('property', 'bicycle'));
  assert.equal(result.error, '');
  const snapshot = getSnapshot(20 * YEAR_MS, initial, result.choices);
  assert.equal(getSnapshot(20 * YEAR_MS, initial, before).finances.savings - snapshot.finances.savings, 6000);
  assert.equal(snapshot.events.filter((event) => event.id === 'test-property-bicycle').length, 1);
  assert.equal(snapshot.finances.ledger.filter((entry) => entry.id === 'test-property-bicycle').length, 1);
  assert.ok(buyItem(20 * YEAR_MS, initial, result.choices, purchase('property', 'bicycle', { id: 'repeat' })).error);
});

test('services and appearance apply effects with a 100-point limit', () => {
  const result = buyItem(20 * YEAR_MS, initial, fundedChoices(), purchase('appearance', 'haircut'));
  assert.equal(getSnapshot(20 * YEAR_MS, initial, result.choices, 64).appearance, 66);
  assert.equal(getSnapshot(20 * YEAR_MS, initial, result.choices, 99).appearance, 100);
});

test('insufficient funds, age restrictions and duplicate transaction do not mutate choices', () => {
  const empty = { answers: {}, focus: {} };
  assert.ok(buyItem(7 * YEAR_MS, initial, empty, purchase('property', 'laptop')).error);
  assert.ok(buyItem(17 * YEAR_MS, initial, fundedChoices(), purchase('education', 'repair')).error);
  assert.ok(buyItem(17 * YEAR_MS, initial, fundedChoices(), purchase('property', 'motorcycle')).error);
  assert.equal(empty.purchases, undefined);
  const bought = buyItem(20 * YEAR_MS, initial, fundedChoices(), purchase('health', 'checkup'));
  const repeated = buyItem(20 * YEAR_MS, initial, bought.choices, purchase('health', 'checkup'));
  assert.ok(repeated.error);
  assert.equal(repeated.choices.purchases.length, 1);
});

test('property upkeep is prorated and charged monthly without duplicates', () => {
  const time = 20 + 1 / 24;
  const result = buyItem(time * YEAR_MS, initial, fundedChoices(), purchase('property', 'bicycle'));
  const firstMonth = getSnapshot((20 + 1 / 12) * YEAR_MS, initial, result.choices);
  const maintenance = firstMonth.finances.ledger.filter((entry) => entry.id.startsWith('maintenance-'));
  assert.equal(maintenance.length, 1);
  assert.equal(maintenance[0].expenses, 25);
  const oneYear = getSnapshot((time + 1) * YEAR_MS, initial, result.choices);
  assert.equal(oneYear.finances.ledger.filter((entry) => entry.id.startsWith('maintenance-')).length, 12);
});

test('pet has a name, purchase expense and recurring care cost', () => {
  assert.ok(buyItem(20 * YEAR_MS, initial, fundedChoices(), purchase('pets', 'cat')).error);
  const result = buyItem(20 * YEAR_MS, initial, fundedChoices(), purchase('pets', 'cat', { petName: 'Василёк' }));
  const snapshot = getSnapshot(21 * YEAR_MS, initial, result.choices);
  assert.ok(snapshot.events.find((event) => event.id === 'test-pets-cat').text.includes('Василёк'));
  assert.equal(snapshot.finances.ledger.filter((entry) => entry.id.startsWith('maintenance-')).reduce((sum, entry) => sum + entry.expenses, 0), 3600);
});

test('education completes after its duration and is not charged again', () => {
  const result = buyItem(20 * YEAR_MS, initial, fundedChoices(), purchase('education', 'repair'));
  assert.equal(getSnapshot(20.49 * YEAR_MS, initial, result.choices).events.some((event) => event.id.endsWith('-completed')), false);
  const snapshot = getSnapshot(20.5 * YEAR_MS, initial, result.choices);
  assert.equal(snapshot.events.filter((event) => event.id === 'test-education-repair-completed').length, 1);
  assert.equal(snapshot.finances.ledger.filter((entry) => entry.id === 'test-education-repair').length, 1);
});

test('every catalog section can be purchased with valid data and financed safely', () => {
  for (const section of Object.keys(shopSections)) {
    for (const item of getShopItems(section, 'Япония')) {
      const result = buyItem(21 * YEAR_MS, initial, fundedChoices(), purchase(section, item.id, { petName: 'Мико' }));
      assert.equal(result.error, '', `${section}/${item.id}`);
      const snapshot = getSnapshot(21 * YEAR_MS, initial, result.choices);
      assert.ok(snapshot.finances.savings >= 0);
      assert.equal(snapshot.finances.ledger.filter((entry) => entry.id === `test-${section}-${item.id}`).length, 1);
    }
  }
});

test('city destinations stay in their selected country', () => {
  for (const country of ['Япония', 'Грузия', 'Армения', 'Сербия', 'Канада', 'Индия', 'Китай', 'Южная Корея', 'Турция', 'Франция']) {
    assert.ok(getShopItems('city', country).length > 0);
    assert.ok(getShopItems('city', country).every((item) => item.location.country === country));
  }
});
