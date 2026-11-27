import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { yearlyFocus } from '../../mocks/gameChoices';
import type { FocusId } from '../../mocks/gameChoices';
import { statLabels } from '../../mocks/lifeEvents';
import type { GameStats } from '../../mocks/lifeEvents';
import type { SessionYearFocus, YearFocusId } from '../../api/sessionTypes';
import { yearFocusOptions } from '../../game/yearFocusPresentation';
import type { FocusConsequence, FocusOptionView } from '../../game/yearFocusPresentation';
import styles from './GamePage.module.scss';

export function Consequences({ effects, description }: { effects: FocusConsequence[]; description?: string }) {
  return (
    <span className={styles.game__consequences}>
      {description && <span>{description}</span>}
      {effects.map((effect) => (
        <span key={effect.id}>{effect.text}</span>
      ))}
    </span>
  );
}

type PanelProps = {
  value: string;
  options: (FocusOptionView & { hidden?: boolean })[];
  disabled: boolean;
  canChange: boolean;
  context: string;
  intro?: string;
  footer: string;
  onChange: (id: string) => void;
};

function YearFocusPanel({ value, options, disabled, canChange, context, intro, footer, onChange }: PanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((item) => item.id === value);
  const draftOption = options.find((item) => item.id === draft);
  const locked = disabled || !canChange;

  function closePanel() {
    toggleRef.current?.focus({ preventScroll: true });
    setOpen(false);
  }

  return (
    <section className={styles.game__card}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.game__focusToggle}
        aria-expanded={open}
        disabled={locked || !selected}
        onClick={() => {
          setDraft(value);
          setOpen(!open);
        }}
      >
        <span>Фокус этого года</span>
        <ChevronDown
          className={styles.game__familyChevron}
          size={14}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </button>
      {intro ? (
        <p>{intro}</p>
      ) : (
        <>
          <p className={styles.game__focusContext}>{context}</p>
          <div className={styles.game__currentFocus}>
            <strong>{selected?.title ?? 'Нет данных'}</strong>
            <Consequences effects={selected?.effects ?? []} />
          </div>
          <div
            className={styles.game__focusCollapse}
            data-open={open}
            aria-hidden={!open}
            inert={!open}
          >
            <div className={styles.game__focusCollapseContent}>
              <div className={styles.game__focusEditor}>
                <p className={styles.game__muted}>На чём сосредоточиться в этом году</p>
                <div role="radiogroup" aria-label="Фокус этого года">
                  {options.filter((item) => !item.hidden).map((item) => (
                    <label
                      key={item.id}
                      className={`${styles.game__focusOption}${draft === item.id ? ` ${styles['game__focusOption--selected']}` : ''}`}
                      title={item.reason ?? item.description}
                    >
                      <span className={styles.game__focusIcon}>{item.icon}</span>
                      <span>
                        <strong>{item.title}</strong>
                        {value === item.id && <small>Сейчас</small>}
                        <Consequences
                          effects={item.effects}
                          description={[item.description, !item.available ? item.reason : null].filter(Boolean).join(' ')}
                        />
                      </span>
                      <input
                        type="radio"
                        name="year-focus"
                        checked={draft === item.id}
                        disabled={locked || !item.available}
                        onChange={() => setDraft(item.id)}
                      />
                    </label>
                  ))}
                </div>
                <p className={styles.game__muted}>{footer}</p>
                <button
                  type="button"
                  className={styles.game__restart}
                  disabled={locked || !draftOption?.available}
                  onClick={() => {
                    if (locked || !draftOption?.available) return;
                    onChange(draftOption.id);
                    closePanel();
                  }}
                >
                  Сменить фокус
                </button>
                <button
                  type="button"
                  className={styles.game__focusBack}
                  onClick={closePanel}
                >
                  Назад
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

type Props = {
  age: number;
  location: string;
  value: FocusId;
  disabled: boolean;
  activity?: string;
  onChange: (id: FocusId) => void;
};

export default function YearFocus({ age, location, value, disabled, activity, onChange }: Props) {
  const context = age >= 18
    ? `${activity || 'Самостоятельная жизнь'} · ${location}`
    : age >= 6
      ? `${Math.min(11, age - 5)}-й класс · ${location}`
      : `Дошкольный возраст · ${location}`;
  const options = yearlyFocus.map((item) => ({
    ...item,
    description: '',
    available: true,
    reason: null,
    hidden: item.id === 'balanced',
    effects: (Object.entries(item.changes) as [keyof GameStats, number][]).map(([key, amount]) => ({
      id: key,
      text: `${statLabels[key]} ${amount > 0 ? '↑' : '↓'}`,
    })),
  }));

  return (
    <YearFocusPanel
      value={value}
      options={options}
      disabled={disabled}
      canChange={age >= 3}
      context={context}
      intro={age < 3 ? 'Ты знакомишься с миром через звуки, прикосновения и лица близких людей. Выбор фокуса появится с 3 лет.' : undefined}
      footer="Фокус влияет на события и показатели в течение года. Бонус начисляется в конце года."
      onChange={(id) => {
        const option = yearlyFocus.find((item) => item.id === id);
        if (option) onChange(option.id);
      }}
    />
  );
}

export function ServerYearFocus({ focus, location, disabled, onChange }: {
  focus: SessionYearFocus;
  location: string;
  disabled: boolean;
  onChange: (id: YearFocusId) => void;
}) {
  return (
    <YearFocusPanel
      value={focus.selectedId}
      options={yearFocusOptions(focus)}
      disabled={disabled}
      canChange={focus.canChange}
      context={[focus.context, location].filter(Boolean).join(' · ')}
      footer="Изменения указаны за 12 месяцев и применяются постепенно. События и решения также влияют на показатели."
      onChange={(id) => {
        const option = focus.options.find((item) => item.id === id && item.available);
        if (option) onChange(option.id);
      }}
    />
  );
}
