export function birthAndLifeSession() {
  const measure = (value, unit, year, basis = 'PROJECTION') => ({
    value, unit, year, basis, source: 'Источник измерения', note: 'Примечание к измерению',
  });
  const description = (value, basis = 'GAME_ASSUMPTION') => ({
    value, basis, source: 'family-model-2', note: 'Игровое допущение, не статистика семей',
  });
  return {
    id: '12345678-1234-1234-1234-123456789abc',
    provider: 'local', version: 24, savedAt: '2026-11-24T12:00:00Z',
    character: {
      name: 'Акира', gender: 'Мужчина', birthYear: 2026,
      birthplace: { countryCode: 'JP', country: 'Япония', city: null },
      background: { wealth: 'Средний', housing: 'Дом', language: 'ja' },
      birthDetails: {
        placeType: 'URBAN', familyIncomeQuintile: 3,
        mother: { age: 24, occupation: { code: 'teacher', label: 'Учитель' }, alive: true },
        father: { age: 28, occupation: null, alive: false },
        siblings: [{ age: 0, sex: 'FEMALE' }], homeOwned: false,
      },
      birthFacts: {
        countryIso3: 'JPN', sex: 'MALE',
        worldBirthProbability: measure(0.005, 'probability', 2026),
        selectionProbability: measure(1, 'probability', 2026, 'GAME_SELECTION'),
        gdpPerCapita: measure(35000.5, 'USD_CURRENT', 2023, 'STATISTIC'),
        lifeExpectancy: measure(85.1, 'years', 2026),
        underFiveMortality: measure(0.002, 'probability', 2026),
        currency: 'JPY',
        countryReligions: [{ code: 'Buddhists', percent: 37.2 }, { code: 'Unaffiliated', percent: 0 }],
        countryLanguages: [{ code: 'ja', percent: 95, status: 'official' }],
        wealth: description('Средний достаток'), housing: description('Квартира'),
        familyRelationships: description('Тёплые отношения'),
        familyFaith: description('Буддизм', 'SAMPLED_PROXY'),
        familyLanguage: description('ja', 'SAMPLED_PROXY'),
        sources: { religions: 'https://example.org/religions', languagesAndCurrency: 'https://example.org/cldr' },
      },
    },
    simulation: {
      engineVersion: 'childhood-2', statisticsRelease: 'birth-context-2026-v1', statisticsYear: 2026,
      elapsedMonths: 46, monthOfYear: 10, stepMonths: 2, death: null,
      family: [
        { id: 'mother-custom-id', role: 'mother', name: 'Эми', age: 27, alive: true, closeness: 100, trust: 80, sex: 'FEMALE', occupation: 'Учитель' },
        { id: 'father', role: 'father', name: 'Кэн', age: 28, alive: false, closeness: 60, trust: 50, sex: 'MALE', occupation: null },
        { id: 'sibling-0', role: 'sister', name: 'Юи', age: 3, alive: true, closeness: 64, trust: 60, sex: 'FEMALE', occupation: 'Ребёнок' },
        { id: 'sibling-9', role: 'brother', name: 'Юи', age: 10, alive: true, closeness: 0, trust: 0, sex: 'MALE', occupation: null },
      ],
      skills: { drawing: 4 }, assumptions: ['Игровая модель семьи'],
    },
    state: {
      age: 3, status: 'ACTIVE',
      stats: { health: 80, happiness: 90, intelligence: 70, relationships: 80, appearance: 60, aura: 100 },
      pendingDecision: null,
      history: [
        { id: 'birth', age: 0, title: 'Рождение', text: 'Начало жизни', consequences: null },
        { id: 'decision-46', age: 3, title: 'Помощь', text: 'Помощь семье', consequences: { aura: 2, closeness: { 'mother-custom-id': 1, 'sibling-9': -4 } } },
      ],
    },
  };
}
