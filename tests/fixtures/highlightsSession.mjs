import { adultSession } from './adultSession.mjs';

export function highlightsSession() {
  const session = adultSession();
  session.state.status = 'COMPLETE';
  session.state.pendingDecision = null;
  session.simulation.death = {
    age: 35,
    elapsedMonths: 420,
    cause: 'UNSPECIFIED',
    model: 'UN_WPP_2024_QX',
    note: 'Сохранённое описание модели',
    causeDetails: {
      code: 'STROKE', label: 'Инсульт', model: 'death-causes-1',
      basis: 'GAME_ASSUMPTION', conditionId: null,
    },
  };
  session.highlights = {
    modelVersion: 'life-highlights-1', status: 'FINAL', currency: 'RUB',
    trackedFromMonth: 0, partialHistory: false, evaluatedThroughMonth: 420,
    finalizedAtMonth: 420, decisionCount: 4, candidateCount: 4,
    slides: [6, 18, 35].map((age, index) => ({
      id: `chapter-${index}`, templateId: 'education', domain: 'EDUCATION',
      month: age * 12, age, title: `Сохранённая глава ${age}`, importance: [20, 95, 40][index],
      reasons: [{ code: 'CONFIRMED', points: 0, text: 'Подтверждённый этап' }],
      decisions: [{
        id: `choice-${index}`, month: age * 12, age, title: 'Реальный вопрос',
        prompt: index === 0 ? null : 'Как поступить?', optionId: `option-${index}`,
        optionLabel: `Реальный ответ ${index} — 1 500 ₽`, offeredOptions: [],
        participantIds: ['mother-custom-id'], historyEventId: `event-${index}`,
        result: `Подтверждённый результат ${index}`, statChanges: { intelligence: 3, happiness: -2 },
        closenessChanges: { 'mother-custom-id': 0 }, balanceChange: index ? -1500 : 0,
      }],
      evidence: [{
        id: `evidence-${index}`, month: age * 12 + 1, kind: 'GRADUATION',
        relation: 'TRACKED_ENTITY', text: `Дальнейшая судьба этой главы ${index}`, historyEventId: null,
      }],
      revisions: [{ month: age * 12, previousScore: 80, score: 20, reasonCodes: ['UNCONFIRMED'] }],
    })),
  };
  session.state.history[0].link = {
    sourceId: 'chapter-0', templateId: 'education', domain: 'EDUCATION', phase: 'DECISION',
    month: 0, decisionId: null, optionId: null, optionLabel: null, action: 'PURCHASE',
    offeredOptions: [], participantIds: [], relatedSourceIds: [],
  };
  return session;
}
