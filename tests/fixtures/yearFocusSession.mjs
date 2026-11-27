import { birthAndLifeSession } from './birthAndLifeSession.mjs';

export function yearFocusSession() {
  const session = birthAndLifeSession();
  session.simulation.yearlyFocus = {
    modelVersion: 'year-focus-1', year: session.state.age, selectedId: 'home', changedMonth: 44,
    canChange: true, context: 'Дошкольный возраст',
    options: [
      { id: 'balanced', title: 'Баланс сервера', description: 'Без дополнительных темпов.', available: true,
        reason: null, effects: { periodMonths: 12, stats: {}, skills: {}, closeness: {} }, matchingEventWeightMultiplier: 1 },
      { id: 'home', title: 'Семья и дом', description: 'Общие дела с близкими.', available: true, reason: null,
        effects: { periodMonths: 12, stats: { relationships: 2, intelligence: -1, happiness: 0 },
          skills: { responsibility: 2 }, closeness: { 'mother-custom-id': 2, 'sibling-0': -1, 'sibling-9': 1 } },
        matchingEventWeightMultiplier: 3 },
      { id: 'work', title: 'Работа', description: 'Практика профессии.', available: false, reason: 'Доступно с 18 лет.',
        effects: { periodMonths: 12, stats: { intelligence: 1, happiness: -1 }, skills: { professional_practice: 3 }, closeness: {} },
        matchingEventWeightMultiplier: 3 },
    ],
    lastApplied: { focusId: 'learning', month: 44, stats: { intelligence: 1 }, skills: {}, closeness: {} },
  };
  return session;
}
