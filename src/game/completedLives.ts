import type { Finances } from '../api/financeTypes.ts';
import type { Session, SessionSummary } from '../api/sessionTypes.ts';
import type { createSessionsApi } from '../api/sessions.ts';
import { validateUuid } from '../api/sessionDecoders.ts';
import { formatOccupationLabel } from '../api/birthFactsPresentation.ts';

export const completedLifePrefix = '#completed-life/';

export function completedLifeId(hash: string) {
  if (!hash.startsWith(completedLifePrefix)) return null;
  const id = hash.slice(completedLifePrefix.length);
  try {
    validateUuid(id);
    return id;
  } catch {
    return null;
  }
}

export function ageText(age: number) {
  const plural = new Intl.PluralRules('ru').select(age);
  return `${age} ${plural === 'one' ? 'год' : plural === 'few' ? 'года' : 'лет'}`;
}

export function lifeYears(session: Session) {
  return `${session.character.birthYear} – ${session.character.birthYear + session.state.age}`;
}

function familySummary(session: Session) {
  const people = session.simulation?.family;
  if (!people) return 'Нет данных';
  const counts = [
    ['child', 'Дети'], ['grandchild', 'Внуки'], ['great-grandchild', 'Правнуки'],
  ].map(([role, label]) => ({ label, count: new Set(people.filter((person) => person.role === role).map((person) => person.id)).size }));
  return counts.filter(({ count }) => count > 0).map(({ label, count }) => `${label}: ${count}`).join(', ')
    || 'Детей и внуков нет';
}

function lifeOccupation(session: Session, finances: Finances | null) {
  const career = session.simulation?.adult?.career;
  if (!career) return finances?.summary.occupation ?? 'Нет данных';
  const endedAt = session.simulation!.elapsedMonths;
  const jobs = [...career.history];
  if (career.occupation && !jobs.some((job) => job.occupation === career.occupation && job.beganMonth === career.beganMonth)) {
    jobs.push({ id: 'current', occupation: career.occupation, employer: career.employer ?? '', beganMonth: career.beganMonth, endedMonth: null, endReason: null });
  }
  const durations = new Map<string, number>();
  for (const job of jobs) {
    const months = Math.max(0, Math.min(job.endedMonth ?? endedAt, endedAt) - job.beganMonth);
    durations.set(job.occupation, (durations.get(job.occupation) ?? 0) + months);
  }
  return [...durations].sort((a, b) => b[1] - a[1])[0]?.[0]
    ?? career.occupation ?? finances?.summary.occupation ?? 'Нет данных';
}

export function completedLifeSummary(session: Session, finances: Finances | null) {
  const months = session.simulation?.death?.elapsedMonths;
  const age = ageText(session.state.age) + (months !== undefined && months % 12 ? `, ${months % 12} мес.` : '');
  const birthplace = [session.character.birthplace.city, session.character.birthplace.country].filter(Boolean).join(', ');
  const home = finances?.location
    ? [finances.location.city, finances.location.country].filter(Boolean).join(', ')
    : 'Нет данных';
  const aura = session.state.stats.aura;
  return {
    name: session.character.name,
    years: lifeYears(session),
    age,
    birthplace: `Место рождения: ${birthplace}.`,
    family: familySummary(session),
    home,
    occupation: formatOccupationLabel(lifeOccupation(session, finances)),
    aura: aura === null ? 'Нет данных' : `${aura > 0 ? '+' : ''}${aura}`,
    auraText: aura === null ? 'Итоговая аура недоступна.' : aura > 0
      ? 'Добрые поступки оставили след.' : aura < 0 ? 'Не все поступки были добрыми.' : 'У каждой жизни свой след.',
  };
}

export type CompletedLifeEntry = { summary: SessionSummary; session: Session | null };
type ArchiveApi = Pick<ReturnType<typeof createSessionsApi>, 'listSessions' | 'getSession'>;

export async function loadCompletedLives(
  api: ArchiveApi,
  signal: AbortSignal,
  onList: (entries: CompletedLifeEntry[]) => void = () => {},
) {
  const summaries = (await api.listSessions(signal)).filter((item) => item.status === 'COMPLETE');
  signal.throwIfAborted();
  const entries: CompletedLifeEntry[] = summaries.map((summary) => ({ summary, session: null }));
  onList([...entries]);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, entries.length) }, async () => {
    while (index < entries.length) {
      signal.throwIfAborted();
      const current = index++;
      try {
        const session = await api.getSession(entries[current].summary.id, signal);
        if (session.state.status === 'COMPLETE') entries[current] = { ...entries[current], session };
      } catch {
        signal.throwIfAborted();
        // Карточка остаётся доступна по краткому сохранению; подробности можно повторить при открытии.
      }
    }
  }));
  signal.throwIfAborted();
  return entries;
}
