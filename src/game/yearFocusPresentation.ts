import type { FocusEffects, SessionStats, SessionYearFocus } from '../api/sessionTypes.ts';
import { statLabels } from '../mocks/lifeEvents.ts';

export type FocusConsequence = { id: string; text: string };
export type FocusOptionView = {
  id: string;
  title: string;
  icon: string;
  description: string;
  available: boolean;
  reason: string | null;
  effects: FocusConsequence[];
};

const stats: Record<keyof SessionStats, string> = { ...statLabels, appearance: 'Внешность', aura: 'Аура' };
const skills: Record<string, string> = {
  learning: 'Учебная практика',
  responsibility: 'Ответственность',
  creative_practice: 'Творческая практика',
  professional_practice: 'Профессиональная практика',
};
const icons: Record<string, string> = {
  balanced: '⚖️', learning: '📚', friends: '🤝', home: '🏡',
  health: '🏃', creativity: '🎨', rest: '😴', work: '💼',
};

const averageFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function yearFocusEffects(effects: FocusEffects): FocusConsequence[] {
  const changes = (['stats', 'skills'] as const).flatMap((kind) =>
    Object.entries(effects[kind]).filter(([, value]) => value !== 0).map(([key, value]) => {
      const label = kind === 'stats' ? stats[key as keyof SessionStats] ?? key : skills[key] ?? key;
      return { id: `${kind}-${key}`, text: `${label} ${value > 0 ? '+' : '−'}${Math.abs(value)}` };
    }));
  const closeness = Object.values(effects.closeness);
  if (closeness.some((value) => value !== 0)) {
    const average = closeness.reduce((sum, value) => sum + value, 0) / closeness.length;
    const amount = averageFormatter.format(Math.abs(average));
    const sign = amount === '0' ? '' : average > 0 ? '+' : '−';
    changes.push({ id: 'closeness', text: `Близкие: ${sign}${amount}` });
  }
  return changes;
}

export function yearFocusOptions(focus: SessionYearFocus): FocusOptionView[] {
  // Display only: the server applies all rates and keeps fractional remainders.
  return focus.options.map((option) => ({
    id: option.id,
    title: option.title,
    icon: icons[option.id] ?? '🌿',
    description: option.description,
    available: option.available,
    reason: option.reason,
    effects: yearFocusEffects(option.effects),
  }));
}
