import { birthAndLifeSession } from './birthAndLifeSession.mjs';

export function adultSession() {
  const session = birthAndLifeSession();
  session.state.age = 35;
  session.simulation.elapsedMonths = 420;
  session.simulation.monthOfYear = 0;
  const traits = { diligence: 70, sociability: 50, openness: 60, resilience: 80 };
  session.simulation.family.push(...[
    ['partner-1', 'partner'], ['child-1', 'child'], ['grandchild-1', 'grandchild'],
    ['great-1', 'great-grandchild'], ['friend-1', 'friend'], ['friend-2', 'friend'], ['inlaw-1', 'in-law'],
  ].map(([id, role]) => ({
    id, role, name: 'Юи', age: 30, alive: true, sex: 'FEMALE',
    occupation: 'Прежняя профессия', closeness: id === 'friend-1' ? 0 : 75, trust: 60,
  })));
  session.simulation.adult = {
    modelVersion: 'adult-1', ageStage: 'MIDDLE_ADULT', currency: 'RUB', traits,
    education: { level: 'SECONDARY', field: null, startedMonth: null, completesMonth: null, status: 'COMPLETED' },
    career: {
      status: 'EMPLOYED', occupation: 'Учитель', industry: 'Образование', employer: 'Школа',
      position: null, monthlyPay: 20000.50, beganMonth: 360, experienceMonths: 60,
      qualification: 1, satisfaction: 80, stability: 70, risk: 0, monthlyPension: 0,
      history: [{ id: 'career-1', occupation: 'Учитель', employer: 'Школа', beganMonth: 360, endedMonth: null, endReason: null }],
    },
    partnership: { partnerId: 'partner-1', status: 'MARRIED', beganMonth: 300, cohabiting: true, satisfaction: 80, conflict: 0, milestones: [] },
    npcs: Object.fromEntries(session.simulation.family.map((person) => [person.id, {
      id: person.id, traits, education: 'SECONDARY', occupation: person.id === 'friend-2' ? null : 'Архитектор',
      monthlyIncome: 15000.50, health: 90, maritalStatus: 'SINGLE', partnerId: null, countryIso2: 'JP',
      parentIds: person.role === 'child' ? ['character', 'partner-1'] : [],
    }])),
    healthConditions: [{ id: 'condition-1', kind: 'INJURY', onsetMonth: 410, severity: 20, stage: 'RECOVERED', treatment: 'REST', reviewMonth: 412, endedMonth: 414, chronic: false, workCapacity: 100 }],
    debts: [{ id: 'debt-1', kind: 'PERSONAL', principal: 10000, annualBasisPoints: 1000, monthlyPayment: 1000, missedPayments: 0 }],
    assets: [{ id: 'asset-1', kind: 'PROPERTY', title: 'Дом', value: 100000, ownershipPercent: 50, purchaseId: null }],
    stories: [{ id: 'story-1', template: 'career', stage: 'employment', status: 'ACTIVE', beganMonth: 360, endedMonth: null, participants: ['friend-1'] }],
    memories: [{ id: 'memory-1', month: 400, kind: 'FAMILY', personId: 'child-1', text: 'Общее дело' }],
    housing: 'Дом', assumptions: [],
  };
  return session;
}

export function adultFinances() {
  return {
    version: 24, age: 35, currency: 'RUB',
    summary: { income: 240000, expenses: 120000, periodMonths: 12, savings: 150000, availableBalance: 150000, netWorth: 190000, debt: 10000, occupation: 'Учитель', depositRateBasisPoints: 100, asOfAge: 35 },
    ledger: [
      { id: 'loan', month: 420, kind: 'BUDGET', flow: 'FINANCING', title: 'Получение займа', income: 100000, expense: 0 },
      { id: 'wage', month: 419, kind: 'BUDGET', flow: 'OPERATING', title: 'Зарплата', income: 20000, expense: 0 },
    ],
    purchases: [], categories: [], location: null,
  };
}
