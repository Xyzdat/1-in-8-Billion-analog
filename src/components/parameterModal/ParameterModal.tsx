import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { locations, parameterFields } from '../../mocks/parameterOptions';
import type { ParameterOption } from '../../mocks/parameterOptions';
import type { SettingKey } from '../../types/character';
import styles from './ParameterModal.module.scss';
import closeIcon from '../../assets/modal-close.svg';
import searchIcon from '../../assets/modal-search.svg';
import radioIcon from '../../assets/modal-radio.svg';
import selectedIcon from '../../assets/modal-radio-selected.svg';
import coinGlyph from '../../assets/modal-coin-glyph.svg';
import coinLine from '../../assets/modal-coin-line.svg';

type ParameterModalProps = {
  field: SettingKey;
  value: string;
  country: string;
  region: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
  showPrice?: boolean;
};

export default function ParameterModal({
  field,
  value,
  country,
  region,
  onClose,
  onConfirm,
  showPrice = true,
}: ParameterModalProps) {
  const config = parameterFields[field];
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Все');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';

    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const availableOptions: ParameterOption[] = field === 'region'
    ? Object.keys(locations[country] || {}).map((label) => ({ label }))
    : field === 'city'
      ? (locations[country]?.[region] || []).map((label) => ({ label }))
      : config.options;
  const options = availableOptions.filter((option) =>
    option.label.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')) &&
    (filter === 'Все' || ('group' in option && option.group === filter)),
  );

  return createPortal(
    <dialog
      ref={dialog}
      className={styles.parameterModal}
      aria-labelledby="parameter-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className={styles.parameterModal__panel}
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) onConfirm(draft.trim());
        }}
      >
        <div className={styles.parameterModal__handle} aria-hidden="true" />
        <header className={styles.parameterModal__header}>
          <h2 id="parameter-modal-title">{config.title}</h2>
          {showPrice && (
            <span className={styles.parameterModal__price}>
              <span className={styles.parameterModal__coin} aria-hidden="true">
                <img src={coinGlyph} alt="" />
                <img src={coinLine} alt="" />
              </span>
              {config.price}
            </span>
          )}
          <button type="button" className={styles.parameterModal__close} onClick={onClose} aria-label="Закрыть"><img src={closeIcon} alt="" /></button>
        </header>
        {field === 'name' ? (
          <>
            <label className={styles.parameterModal__label} htmlFor="character-name">Имя и фамилия</label>
            <input
              id="character-name"
              className={styles.parameterModal__input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={100}
              autoComplete="off"
              required
            />
            <span className={styles.parameterModal__hint}>Подсказки</span>
            <div className={styles.parameterModal__chips}>
              {config.options.map((option) => <button type="button" key={option.label} onClick={() => setDraft(option.label)}>{option.label}</button>)}
            </div>
            <button type="button" className={styles.parameterModal__random} onClick={() => {
              const others = config.options.filter((option) => option.label !== draft);
              setDraft(others[Math.floor(Math.random() * others.length)].label);
            }}>🎲 Случайное имя</button>
          </>
        ) : (
          <>
            {config.search && <label className={styles.parameterModal__searchBox}><img src={searchIcon} alt="" /><input type="search" className={styles.parameterModal__search} aria-label={config.search} placeholder={config.search} value={query} onChange={(event) => setQuery(event.target.value)} /></label>}
            {field === 'country' && <div className={styles.parameterModal__chips}>
              {['Все', 'Азия', 'Европа', 'Америка'].map((group) => <button type="button" aria-pressed={filter === group} key={group} onClick={() => setFilter(group)}>{group}</button>)}
            </div>}
            <div className={`${styles.parameterModal__options}${field === 'gender' ? ` ${styles['parameterModal__options--gender']}` : ''}`} role="radiogroup" aria-label={config.title}>
              {!options.length && <p className={styles.parameterModal__hint}>Ничего не найдено</p>}
              {options.map((option) => (
                <label key={option.label} className={`${styles.parameterModal__option}${draft === option.label ? ` ${styles['parameterModal__option--selected']}` : ''}`}>
                  {'image' in option && option.image ? <img className={styles.parameterModal__optionImage} src={option.image} alt="" /> : 'icon' in option && option.icon && <span aria-hidden="true">{option.icon}</span>}
                  <span>{option.label}</span>
                  <input type="radio" name="parameter" checked={draft === option.label} onChange={() => setDraft(option.label)} />
                  <img className={styles.parameterModal__radio} src={draft === option.label ? selectedIcon : radioIcon} alt="" />
                </label>
              ))}
            </div>
            {config.hint && <p className={styles.parameterModal__hint}>{config.hint}</p>}
          </>
        )}
        <button type="submit" className={styles.parameterModal__confirm} disabled={!draft.trim()}>Выбрать</button>
      </form>
    </dialog>,
    document.body,
  );
}
