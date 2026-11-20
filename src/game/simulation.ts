import { lifeEvents } from '../mocks/lifeEvents.ts';
import type { GameStats } from '../mocks/lifeEvents.ts';
import { decisions, yearlyFocus } from '../mocks/gameChoices.ts';
import type { FocusId } from '../mocks/gameChoices.ts';
import { initialCloseness, yearlyFamilyChanges } from '../mocks/lifeEconomy.ts';
import type { PersonId } from '../mocks/lifeEconomy.ts';
import { getFinances } from './finances.ts';
import type { LifeEvent } from '../mocks/lifeEvents.ts';
import { purchaseEvents } from './spending.ts';
import type { Purchase } from './spending.ts';
import { getShopItems, shopSections } from '../mocks/spendingCatalog.ts';
import type { ShopSection } from '../mocks/spendingCatalog.ts';

export const YEAR_MS = 60_000;
export const END_AGE = 22;
export const END_MS = END_AGE * YEAR_MS;
export const speeds = [1, 2, 4, 8, 16] as const;

export function advanceTime(elapsed: number, realDelta: number, speed: number, paused: boolean) {
  return Math.min(END_MS, elapsed + (paused ? 0 : Math.max(0, realDelta) * speed));
}

export type GameChoices = { answers: Record<string, number>; focus: Record<number, FocusId>; deferred?: Record<string, number>; purchases?: Purchase[] };

export function nextDecision(elapsed: number, answers: GameChoices['answers'], deferred: Record<string, number> = {}) {
  return [...decisions].sort((a, b) => (deferred[a.id] ?? a.age) - (deferred[b.id] ?? b.age)).find((decision) => answers[decision.id] === undefined && (deferred[decision.id] ?? decision.age) * YEAR_MS <= elapsed);
}

export function advanceUntilDecision(elapsed: number, realDelta: number, speed: number, paused: boolean, choices: GameChoices) {
  const candidate = advanceTime(elapsed, realDelta, speed, paused);
  const decision = nextDecision(candidate, choices.answers, choices.deferred);
  return {
    elapsed: decision ? Math.min(candidate, (choices.deferred?.[decision.id] ?? decision.age) * YEAR_MS) : candidate,
    decision,
  };
}

export function getSnapshot(elapsed: number, initial: GameStats, choices: GameChoices = { answers: {}, focus: {} }, initialAppearance = 64) {
  const time = Math.max(0, Math.min(END_MS, elapsed));
  const age = Math.floor(time / YEAR_MS);
  const events: LifeEvent[] = lifeEvents.filter((event) => event.age * YEAR_MS <= time).map((event) => ({ ...event }));
  events.push(...purchaseEvents(choices.purchases || [], time / YEAR_MS));
  for (const decision of decisions) {
    const answer = decision.options[choices.answers[decision.id]];
    const decisionAge = choices.deferred?.[decision.id] ?? decision.age;
    if (answer && decisionAge * YEAR_MS <= time) events.push({ id: decision.id, age: decisionAge, title: decision.title, text: answer.text, changes: answer.changes, aura: answer.aura, closeness: answer.closeness, money: answer.money, career: answer.career });
  }
  for (let year = 3; year < age; year++) {
    const focus = yearlyFocus.find((item) => item.id === (choices.focus[year] || 'balanced'))!;
    events.push({ id: `focus-${year}`, age: year + 1, title: `Фокус года: ${focus.title}`, text: focus.description, changes: focus.changes, closeness: focus.id === 'home' ? { mother: 2, father: 2 } : focus.id === 'friends' ? { friend: 2 } : {} });
  }
  for (const [year, closeness] of Object.entries(yearlyFamilyChanges)) {
    if (Number(year) > age) continue;
    events.push({ id: `family-${year}`, age: Number(year), title: 'Отношения с близкими', text: 'Взросление, общие дела и время врозь меняют близость с семьёй и друзьями.', changes: {}, closeness });
  }
  events.sort((a, b) => a.age - b.age);
  const stats = { ...initial };
  const closeness = { ...initialCloseness };
  let aura = 0;
  let appearance = initialAppearance;
  for (const event of events) {
    appearance = Math.max(0, Math.min(100, appearance + (event.appearance || 0)));
    for (const person of Object.keys(event.closeness || {}) as PersonId[]) {
      closeness[person] = Math.max(0, Math.min(100, closeness[person] + (event.closeness?.[person] || 0)));
    }
    aura = Math.max(-100, Math.min(100, aura + (event.aura || 0)));
    for (const key of Object.keys(event.changes) as (keyof GameStats)[]) {
      stats[key] = Math.max(0, Math.min(100, stats[key] + (event.changes[key] || 0)));
    }
  }
  const finances = getFinances(time / YEAR_MS, events);
  return { age, events, stats, aura, appearance, closeness, finances, complete: time === END_MS, progress: time === END_MS ? 1 : (time % YEAR_MS) / YEAR_MS };
}

export function buyItem(elapsed: number, initial: GameStats, choices: GameChoices, purchase: Purchase) {
  const age = elapsed / YEAR_MS;
  const item = getShopItems(purchase.section, purchase.country).find((entry) => entry.id === purchase.itemId);
  if (!item) return { error: 'Вариант недоступен.', choices };
  if (age < shopSections[purchase.section].minAge || (['house', 'motorcycle'].includes(item.id) && age < 18)) {
    return { error: 'Недоступно в этом возрасте.', choices };
  }
  const existing = choices.purchases || [];
  if (existing.some((entry) => entry.id === purchase.id || (['property', 'education', 'hobby'].includes(purchase.section) && entry.section === purchase.section && entry.itemId === item.id))) {
    return { error: 'Уже приобретено.', choices };
  }
  if (purchase.section === 'pets' && !purchase.petName?.trim()) return { error: 'Укажите кличку.', choices };
  if (getSnapshot(elapsed, initial, choices).finances.savings < item.price) return { error: 'Недостаточно средств.', choices };
  return { error: '', choices: { ...choices, purchases: [...existing, { ...purchase, age }] } };
}
