import type { BirthDescription, BirthMeasure, ParentAtBirth, SessionCharacter } from './sessionTypes.ts';

const numbers = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const yearsPlural = new Intl.PluralRules('ru');
const languageNames = new Intl.DisplayNames(['ru'], { type: 'language', fallback: 'code' });
const currencyNames = new Intl.DisplayNames(['ru'], { type: 'currency', fallback: 'code' });
const religionNames: Record<string, string> = {
  Christians: 'Христианство',
  Muslims: 'Ислам',
  Unaffiliated: 'Без религиозной принадлежности',
  Buddhists: 'Буддизм',
  Hindus: 'Индуизм',
  Jews: 'Иудаизм',
  'Other religions': 'Другие религии',
};

export function localizedLanguage(code: string) {
  try {
    const normalized = code.replaceAll('_', '-');
    const primary = normalized.split('-')[0];
    if (languageNames.of(primary) === primary) return code;
    return languageNames.of(normalized) ?? code;
  } catch {
    return code;
  }
}

export function localizedCurrency(code: string) {
  try {
    const name = currencyNames.of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

export function formatBirthMeasure(measure: BirthMeasure | null | undefined) {
  if (measure == null) return 'Нет данных';
  if (measure.unit === 'probability') {
    return `${numbers.format(measure.value * 100)}%`;
  }
  if (measure.unit === 'USD_CURRENT') {
    return `${numbers.format(measure.value)} USD`;
  }
  const plural = yearsPlural.select(Math.round(measure.value));
  const unit = plural === 'one' ? 'год' : plural === 'few' ? 'года' : 'лет';
  return `${numbers.format(measure.value)} ${unit}`;
}

export function formatBirthDescription(fact: BirthDescription | null | undefined, language = false) {
  if (fact?.value == null) return null;
  return language ? localizedLanguage(fact.value) : fact.value;
}

export function birthWealthValue(character: SessionCharacter) {
  return character.birthFacts?.wealth.value ?? character.background?.wealth ?? null;
}

export function formatOccupationLabel(value: string) {
  return value.replace(/\s*·\s*игровая специализация\s*$/iu, '');
}

export function parentOccupationLabel(occupation: ParentAtBirth['occupation'], fallback?: string | null) {
  if (occupation?.label != null) return formatOccupationLabel(occupation.label);
  if (occupation?.code === 'UNSPECIFIED') return 'Нет данных о профессии';
  return fallback == null
    ? occupation == null ? null : 'Нет данных о профессии'
    : formatOccupationLabel(fallback);
}

export function formatCountryReligions(religions: { code: string; percent: number }[]) {
  if (religions.length === 0) return 'Нет данных';
  const largest = religions.reduce((best, current) => current.percent > best.percent ? current : best);
  return `${religionNames[largest.code] ?? largest.code} — ${numbers.format(largest.percent)}%`;
}
