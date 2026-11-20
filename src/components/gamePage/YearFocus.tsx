import { useState } from 'react';
import { yearlyFocus } from '../../mocks/gameChoices';
import type { FocusId } from '../../mocks/gameChoices';
import type { GameStats } from '../../mocks/lifeEvents';
import { statLabels } from '../../mocks/lifeEvents';
import styles from './GamePage.module.scss';

export function Consequences({ changes }: { changes: Partial<GameStats> }) {
  return <span className={styles.game__consequences}>{(Object.keys(changes) as (keyof GameStats)[]).map((key) => <span key={key}>{statLabels[key]} {Number(changes[key]) > 0 ? '↑' : '↓'}</span>)}</span>;
}

type Props = { age: number; location: string; value: FocusId; disabled: boolean; activity?: string; onChange: (id: FocusId) => void };

export default function YearFocus({ age, location, value, disabled, activity, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const selected = yearlyFocus.find((item) => item.id === value)!;
  const context = age >= 18
    ? `${activity || 'Самостоятельная жизнь'} · ${location}`
    : age >= 6
      ? `${Math.min(11, age - 5)}-й класс · ${location}`
      : `Дошкольный возраст · ${location}`;
  return <section className={styles.game__card}>
    <button type="button" className={styles.game__focusToggle} aria-expanded={open} disabled={age < 3 || disabled} onClick={() => {
      setDraft(value);
      setOpen(!open);
    }}><span>Фокус этого года</span><span>{open ? '⌃' : '⌄'}</span></button>
    {age < 3 ? <p>Ты знакомишься с миром через звуки, прикосновения и лица близких людей. Выбор фокуса появится с 3 лет.</p> : <>
      <p className={styles.game__focusContext}>{context}</p>
      <div className={styles.game__currentFocus}><strong>{selected.title}</strong><Consequences changes={selected.changes} /></div>
      {open && <div className={styles.game__focusEditor}>
        <p className={styles.game__muted}>На чём сосредоточиться в этом году</p>
        <div role="radiogroup" aria-label="Фокус этого года">
          {yearlyFocus.filter((item) => item.id !== 'balanced').map((item) => <label key={item.id} className={`${styles.game__focusOption}${draft === item.id ? ` ${styles['game__focusOption--selected']}` : ''}`}>
            <span className={styles.game__focusIcon}>{item.icon}</span>
            <span><strong>{item.title}</strong>{value === item.id && <small>Сейчас</small>}<Consequences changes={item.changes} /></span>
            <input type="radio" name="year-focus" checked={draft === item.id} onChange={() => setDraft(item.id)} />
          </label>)}
        </div>
        <p className={styles.game__muted}>Фокус влияет на события и показатели в течение года. Бонус начисляется в конце года.</p>
        <button type="button" className={styles.game__restart} onClick={() => { onChange(draft); setOpen(false); }}>Сменить фокус</button>
        <button type="button" className={styles.game__focusBack} onClick={() => setOpen(false)}>Назад</button>
      </div>}
    </>}
  </section>;
}
