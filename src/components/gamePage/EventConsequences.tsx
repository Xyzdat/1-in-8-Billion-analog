import { statLabels } from '../../mocks/lifeEvents';
import { personLabels } from '../../mocks/lifeEconomy';
import type { PersonId } from '../../mocks/lifeEconomy';
import type { HistoryStatKey, PresentedLifeEvent } from '../../game/serverPresentation';
import styles from './GamePage.module.scss';

type Props = {
  event: PresentedLifeEvent;
  peopleLabels?: Record<string, string>;
};

const labels: Record<HistoryStatKey, string> = { ...statLabels, appearance: 'Внешность' };

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${value}`;
}

export default function EventConsequences({ event, peopleLabels }: Props) {
  const changes: { id: string; text: string }[] = [];
  for (const key of Object.keys(labels) as HistoryStatKey[]) {
    const value = event.changes[key] ?? (key === 'appearance' ? event.appearance : undefined);
    if (value !== undefined && value !== 0) {
      changes.push({ id: key, text: `${labels[key]} ${signed(value)}` });
    }
  }
  if (event.aura) changes.push({ id: 'aura', text: `Аура ${signed(event.aura)}` });
  for (const [id, value] of Object.entries(event.closeness ?? {})) {
    if (value === 0) continue;
    const name = peopleLabels?.[id] ?? personLabels[id as PersonId] ?? id;
    changes.push({ id: `closeness-${id}`, text: `${name}: близость ${signed(value)}` });
  }
  if (event.money?.income) {
    changes.push({ id: 'income', text: `Доход +${event.money.income.toLocaleString('ru-RU')} ₽` });
  }
  if (event.money?.expenses) {
    changes.push({ id: 'expenses', text: `Расход −${event.money.expenses.toLocaleString('ru-RU')} ₽` });
  }
  if (changes.length === 0) return null;

  return (
    <div className={styles.game__changes}>
      {changes.map((change) => (
        <span key={change.id}>{change.text}</span>
      ))}
    </div>
  );
}
