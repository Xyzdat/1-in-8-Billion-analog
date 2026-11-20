import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getShopItems, petNames, shopSections } from '../../mocks/spendingCatalog';
import type { ShopSection } from '../../mocks/spendingCatalog';
import type { Purchase } from '../../game/spending';
import styles from './SpendingPanel.module.scss';

type Props = {
  section: ShopSection;
  country: string;
  city: string;
  age: number;
  balance: number;
  health: number;
  appearance: number;
  purchases: Purchase[];
  onClose: () => void;
  onBlockTime: (blocked: boolean) => void;
  onBuy: (section: ShopSection, itemId: string, country: string, petName?: string) => string;
  initialItemId?: string;
};

const money = (value: number) => `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;

export default function SpendingPanel(props: Props) {
  const { section, country, city, age, balance, health, appearance, purchases, onBuy, onClose, onBlockTime } = props;
  const config = shopSections[section];
  const items = getShopItems(section, country);
  const [selectedId, setSelectedId] = useState(props.initialItemId || items[0]?.id || '');
  const [petName, setPetName] = useState(petNames[0]);
  const [message, setMessage] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const selected = items.find((item) => item.id === selectedId);
  const isMoving = section === 'city' || section === 'country';
  const isOwned = purchases.some((purchase) => ['property', 'education', 'hobby'].includes(section) && purchase.section === section && purchase.itemId === selectedId);
  const ageRestricted = age < config.minAge || (['house', 'motorcycle'].includes(selectedId) && age < 18);
  const currentLocation = selected?.location?.country === country && selected.location.city === city;
  const reason = !selected ? 'Нет доступных вариантов для этой страны.'
    : ageRestricted ? `Доступно с ${['house', 'motorcycle'].includes(selectedId) ? 18 : config.minAge} лет.`
      : isOwned ? 'Уже приобретено.'
        : currentLocation ? 'Ты уже живёшь здесь.'
          : balance < selected.price ? 'Недостаточно средств.'
            : section === 'pets' && !petName.trim() ? 'Укажи кличку питомца.' : '';

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    onBlockTime(true);
    document.body.style.overflow = 'hidden';
    dialog?.showModal();

    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      onBlockTime(false);
      previousFocus?.focus();
    };
    // Панель фиксирует время только на открытие/закрытие.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirm() {
    if (reason || !selected || submitting.current) return;
    submitting.current = true;
    const error = onBuy(section, selected.id, country, section === 'pets' ? petName.trim() : undefined);
    if (error) {
      submitting.current = false;
      setMessage(error);
      return;
    }
    onClose();
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.spending}
      aria-labelledby="spending-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.spending__content}>
        <header className={styles.spending__header}>
          <button type="button" onClick={onClose} aria-label="Вернуться в игру">←</button>
          <h1 id="spending-title">{config.title}</h1>
        </header>

        <section className={styles.spending__balance}>
          <span className={styles.spending__icon}>{section === 'health' ? '❤️' : section === 'appearance' ? '🔥' : '💰'}</span>
          {['health', 'appearance'].includes(section) && (
            <div className={styles.spending__stat}>
              <b>{section === 'health' ? 'Здоровье' : 'Внешность'}</b>
              <strong>{section === 'health' ? health : appearance} из 100</strong>
            </div>
          )}
          <div>
            <span>Доступно</span>
            <strong>{money(balance)}</strong>
          </div>
          {['health', 'appearance'].includes(section) && (
            <progress
              className={section === 'appearance' ? styles['spending__progress--appearance'] : ''}
              max={100}
              value={section === 'health' ? health : appearance}
              aria-label={section === 'health' ? 'Здоровье' : 'Внешность'}
            />
          )}
        </section>

        <section>
          <h2>{config.heading}</h2>
          <p className={styles.spending__subtitle}>{config.description}</p>
          <div className={styles.spending__options} role="radiogroup" aria-label={config.heading}>
            {items.map((item) => (
              <label className={`${styles.spending__option}${selectedId === item.id ? ` ${styles['spending__option--selected']}` : ''}`} key={item.id}>
                <span className={styles.spending__icon}>{item.icon}</span>
                <span className={styles.spending__optionText}>
                  <strong>{item.title}</strong>
                  <b>{money(item.price)}</b>
                  <small>
                    {item.yearlyCost ? `Расход — ${money(item.yearlyCost)} в год`
                      : item.durationMonths ? `Длительность — ${item.durationMonths} мес.` : item.description}
                  </small>
                </span>
                <input
                  type="radio"
                  name="spending-option"
                  checked={selectedId === item.id}
                  onChange={() => {
                    setSelectedId(item.id);
                    setMessage('');
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        {section === 'pets' && (
          <section className={styles.spending__card}>
            <label htmlFor="pet-name"><h3>Кличка</h3></label>
            <input id="pet-name" className={styles.spending__name} value={petName} maxLength={40} onChange={(event) => setPetName(event.target.value)} />
            <button className={styles.spending__random} type="button" onClick={() => setPetName(petNames[(petNames.indexOf(petName) + 1) % petNames.length])}>
              🎲 Случайная кличка
            </button>
          </section>
        )}

        {selected && (
          <section className={styles.spending__card}>
            <h3>{isMoving ? `${selected.location?.country} · ${selected.location?.city}` : `Выбрано: ${selected.title.toLowerCase()}`}</h3>
            {isMoving && (
              <p>Ты переедешь в {selected.location?.city}. Стоимость включает дорогу и переезд.</p>
            )}
            {section === 'education' && (
              <p>{selected.description} Длительность — {selected.durationMonths} мес.</p>
            )}
            <div className={styles.spending__row}>
              <span>Стоимость</span>
              <strong>{money(selected.price)}</strong>
            </div>
            <div className={styles.spending__row}>
              <span>После оплаты останется</span>
              <strong>{money(balance - selected.price)}</strong>
            </div>
          </section>
        )}

        {(reason || message) && (
          <p className={styles.spending__error} role="status">{message || reason}</p>
        )}
        <button className={styles.spending__confirm} type="button" disabled={Boolean(reason)} onClick={confirm}>
          {config.confirm}
        </button>
        <button className={styles.spending__back} type="button" onClick={onClose}>Назад</button>
      </div>
    </dialog>,
    document.body,
  );
}
