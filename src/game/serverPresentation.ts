import type { AdultLife, ContactState, SessionHistoryEvent, SimulationDeath, SimulationFamilyMember } from '../api/sessionTypes.ts';
import type { LifeEvent } from '../mocks/lifeEvents.ts';

export type PresentedLifeEvent = Omit<LifeEvent, 'closeness'> & { closeness?: Record<string, number> };
export type PresentedPerson = {
  id: string;
  name: string;
  role: string;
  age: number;
  alive: boolean;
  contactLabel?: string;
  occupation: string;
  icon: string;
  closeness: number;
};

const roles: Record<string, string> = {
  mother: 'Мама', father: 'Папа', brother: 'Брат', sister: 'Сестра', sibling: 'Брат / сестра',
  partner: 'Партнёр', child: 'Ребёнок', grandchild: 'Внук / внучка',
  'great-grandchild': 'Правнук / правнучка', friend: 'Друг / подруга', 'in-law': 'Родственник по браку',
};

const contactLabels: Record<ContactState['status'], string> = {
  IN_TOUCH: 'Общаемся',
  RARE_CONTACT: 'Редко общаемся',
  NO_CONTACT: 'Связь прервана',
};

export function toServerFamily(family: SimulationFamilyMember[], adult?: AdultLife | null): PresentedPerson[] {
  return family.map((person) => {
    const npc = adult?.npcs[person.id];
    const occupation = npc ? npc.occupation : person.occupation;
    return {
      id: person.id,
      name: person.name,
      role: [roles[person.role] ?? person.role, person.alive ? null : person.sex === 'FEMALE' ? 'умерла' : person.sex === 'MALE' ? 'умер' : 'нет в живых']
        .filter(Boolean).join(' · '),
      age: person.age,
      alive: person.alive,
      contactLabel: person.alive && person.contact ? contactLabels[person.contact.status] : undefined,
      occupation: occupation ?? 'Нет данных о занятиях',
      icon: person.role === 'mother' ? '👩' : person.role === 'father' ? '👨'
        : person.sex === 'FEMALE' ? person.age < 18 ? '👧' : '👩'
          : person.sex === 'MALE' ? person.age < 18 ? '👦' : '👨' : '👤',
      closeness: person.closeness,
    };
  });
}

export function toServerHistory(history: SessionHistoryEvent[]): PresentedLifeEvent[] {
  // Consequences are labels only. Stats and family already contain these changes.
  return history.map((event) => ({
    ...event,
    changes: {},
    aura: event.consequences?.aura,
    closeness: event.consequences?.closeness,
  }));
}

export function completedLifeMessage(death: SimulationDeath | null | undefined) {
  if (!death) return 'Эта жизнь завершена.';
  const plural = new Intl.PluralRules('ru').select(death.age);
  const unit = plural === 'one' ? 'год' : plural === 'few' ? 'года' : 'лет';
  return `Эта жизнь завершена. Возраст: ${death.age} ${unit}, ${death.elapsedMonths % 12} мес. ${death.note}`.trim();
}
