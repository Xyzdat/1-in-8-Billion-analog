export const employment = {
  id: 'employment-1', title: 'Специалист', status: 'EMPLOYED', basePay: 20000,
  periodMonths: 1, hoursPerWeek: 40, schedule: 'Полная занятость',
  currentTenureMonths: 8, totalExperienceMonths: 20, workCapacityPercent: 80,
  expectedPay: 16000, actualIncome: null, actualPeriodMonths: 12,
};

export const forecast = {
  months: 2, balance: 1000, available: 1000, expectedIncome: 32000,
  requiredPayments: 34000, projectedBalance: -1000, deficit: 1000,
  assumption: 'Без будущих случайных событий.',
};

export const storage = { selectedId: 'deposit', amount: 1000, actualReturn: 0, basis: 'Номинальный игровой вклад.' };
const availability = { available: true, reason: null };

export function budgetPage(data, changes = {}) {
  return { version: 12, currency: 'RUB', periodMonths: 12, ...availability, data, ...changes };
}

export function budgetPages() {
  const jobs = {
    offers: [{
      id: 'warehouse', title: 'Помощник на складе', basePay: 12000, periodMonths: 1,
      hoursPerWeek: 40, schedule: 'Полная занятость', education: 'SECONDARY',
      minQualification: 0, minExperienceMonths: 0, noExperience: true, experienceMatch: true, ...availability,
    }],
    raiseGrounds: [{
      id: 'results', currentPay: 20000, proposedPay: 23000, extraHours: 0, guaranteed: false, ...availability,
    }],
    current: { ...employment }, canQuit: true, quitReason: null,
  };
  return {
    income: budgetPage({ total: 0, monthlyAverage: 0, sources: [], primary: { ...employment }, secondary: null, business: null, storage: { ...storage } }),
    expenses: budgetPage({
      total: 0, monthlyAverage: 0, categories: [], forecast: { ...forecast },
      obligations: [{ id: 'debt-1', title: 'Кредит', type: 'PERSONAL', principal: 24000, annualBasisPoints: 1200,
        nextMonthlyInterest: 240, plannedPrincipalPayment: 1000, scheduledMonthsRemaining: null, assetId: 'asset-1' }],
    }),
    jobs: budgetPage(jobs),
    'side-jobs': budgetPage({ ...structuredClone(jobs), raiseGrounds: [], current: null, canQuit: false, quitReason: 'Нет подработки' }),
    businesses: budgetPage({ offers: [{ id: 'workshop', title: 'Мастерская', investment: 150000, currentNetTarget: 15000,
      periodMonths: 1, risk: 50, expectation: 'Цель не гарантирована.', ...availability }], current: null, compatibility: 'Бизнес не совмещается с работой.' }),
    strategies: budgetPage({ selectedId: 'deposit', current: { ...storage }, options: [
      { id: 'deposit', title: 'Вклад', description: 'Номинальная ставка', risk: 'Низкий', annualBasisPoints: 100, ...availability },
      { id: 'cash', title: 'Не вкладывать', description: 'Без начислений', risk: 'Нет', annualBasisPoints: 0, ...availability },
      { id: 'bonds', title: 'Облигации', description: '', risk: '', annualBasisPoints: null, available: false, reason: 'Пока не реализовано' },
    ] }),
    assets: budgetPage({ assets: [{ id: 'asset-1', title: 'Мотоцикл', kind: 'PROPERTY', ownershipPercent: 100,
      salePrice: 28000, debtIds: ['debt-1'], ...availability }], sales: [] }),
  };
}

export function salePreview(changes = {}) {
  return budgetPage({ assetId: 'asset-1', title: 'Мотоцикл', salePrice: 28000, debtPayoff: 24000,
    net: 4000, balanceAfterSale: 5000, obligationIds: ['debt-1'], yearlyUpkeepStopped: 600,
    rentalIncomeStopped: null, rentalModelled: false, forecast: { ...forecast },
    priceRule: 'Игровая оценка.', ...availability, ...changes });
}
