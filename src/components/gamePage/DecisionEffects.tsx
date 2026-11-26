import type { DecisionStatEffects } from '../../api/sessionTypes';
import { statLabels } from '../../mocks/lifeEvents';
import styles from './GamePage.module.scss';

type Props = {
  effects?: DecisionStatEffects | null;
  aura?: number | null;
};

const labels = { ...statLabels, appearance: 'Внешность', aura: 'Аура' };

export default function DecisionEffects({ effects, aura }: Props) {
  const changes = (Object.keys(labels) as (keyof typeof labels)[]).flatMap((key) => {
    const value = effects?.[key] ?? (key === 'aura' ? aura : undefined);
    if (value == null || value === 0) return [];
    return [{
      key,
      label: labels[key],
      direction: value > 0 ? '↑' : '↓',
      description: `${labels[key]} ${value > 0 ? '+' : ''}${value}`,
    }];
  });
  if (changes.length === 0) return null;

  return (
    <span className={styles.game__consequences}>
      {changes.map((change) => (
        <span key={change.key} title={change.description}>
          {change.label} {change.direction}
        </span>
      ))}
    </span>
  );
}
