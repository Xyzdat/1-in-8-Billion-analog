import { useState } from 'react';
import { sessionsApi } from '../../api';
import type { Session } from '../../api/sessionTypes';
import type { SpendingCategoryId } from '../../api/financeTypes';
import type { ServerLife } from '../../game/useServerLife';
import { useSessionResource } from '../../game/useSessionResource';
import { formatServerMoney, formatSpendingEffects } from '../../game/financePresentation';
import SpendingDialog from './SpendingDialog';
import styles from './SpendingPanel.module.scss';

type Props = {
  session: Session;
  server: ServerLife;
  categoryId: SpendingCategoryId;
  initialItemId?: string;
  onClose: () => void;
  onBlockTime: (blocked: boolean) => void;
};

export default function ServerSpendingPanel({
  session,
  server,
  categoryId,
  initialItemId,
  onClose,
  onBlockTime,
}: Props) {
  const resource = useSessionResource(session, server, `spending:${categoryId}`,
    (signal) => sessionsApi.getSpending(session.id, categoryId, signal));
  const { data: shop, loading, error, retry } = resource;
  const [selectedId, setSelectedId] = useState(initialItemId ?? '');
  const [petName, setPetName] = useState<string | null>(null);
  const selected = shop?.offers.find((offer) => offer.id === selectedId) ?? shop?.offers[0];
  const currentPetName = petName ?? shop?.suggestedPetNames[0] ?? '';
  const locked = session.state.status === 'COMPLETE' || server.busy || Boolean(server.failure?.retry);
  const readOnly = session.provider !== 'local';
  const money = (value: number | null) => formatServerMoney(value, shop?.currency ?? 'RUB');
  const stat = shop && (categoryId === 'health' ? shop.stats.health : categoryId === 'appearance' ? shop.stats.appearance : null);
  const statLabel = categoryId === 'health' ? 'Здоровье' : 'Внешность';
  const showStat = categoryId === 'health' || categoryId === 'appearance';
  const reason = error ? 'Не удалось обновить варианты покупки.'
    : loading || shop?.version !== session.version ? 'Обновляем варианты покупки…'
      : readOnly ? 'Покупки через 1in8b пока недоступны. Предложения можно просматривать.'
        : session.state.status === 'COMPLETE' ? 'Жизнь завершена.'
          : !selected ? 'Доступных вариантов пока нет.'
            : !selected.purchasable ? selected.unavailableReason ?? 'Покупка недоступна.'
              : categoryId === 'pets' && (!currentPetName.trim() || /\p{Cc}/u.test(currentPetName))
                ? 'Укажи кличку питомца длиной до 40 символов.' : '';

  function confirm() {
    if (reason || locked || !shop || !selected || shop.confirmLabel === null) return;
    server.purchase({
      expectedVersion: shop.version,
      categoryId: shop.category.id,
      itemId: selected.id,
      ...(categoryId === 'pets' ? { petName: currentPetName.trim() } : {}),
    }, onClose);
  }

  return (
    <SpendingDialog
      title={shop?.category.title ?? 'Бюджет'}
      onClose={onClose}
      onBlockTime={onBlockTime}
      busy={server.busy}
    >
      {loading && <p role="status">Обновляем варианты покупки…</p>}
      {error && (
        <section className={styles.spending__card}>
          <p role="alert">{error}</p>
          <button type="button" className={styles.spending__back} onClick={retry} disabled={loading}>
            Повторить загрузку
          </button>
        </section>
      )}

      {shop && (
        <>
          <section className={styles.spending__balance}>
            <span className={styles.spending__icon} aria-hidden="true">
              {showStat ? categoryId === 'health' ? '❤️' : '🔥' : '💰'}
            </span>
            {showStat && (
              <div className={styles.spending__stat}>
                <b>{statLabel}</b>
                <strong>{stat == null ? 'Нет данных' : `${stat} из 100`}</strong>
              </div>
            )}
            <div>
              <span>Доступно</span>
              <strong>{money(shop.availableBalance)}</strong>
            </div>
            {showStat && stat != null && (
              <progress
                className={categoryId === 'appearance' ? styles['spending__progress--appearance'] : ''}
                max={100}
                value={stat}
                aria-label={statLabel}
              />
            )}
          </section>

          <section>
            <h2>{shop.heading}</h2>
            <p className={styles.spending__subtitle}>{shop.description}</p>
            {shop.currency === 'PPP_USD' && (
              <p className={styles.spending__subtitle}>Цены в международных долларах по ППС.</p>
            )}
            <div className={styles.spending__options} role="radiogroup" aria-label={shop.heading}>
              {shop.offers.map((offer) => (
                <label
                  key={offer.id}
                  className={`${styles.spending__option}${selected?.id === offer.id ? ` ${styles['spending__option--selected']}` : ''}`}
                >
                  <span className={styles.spending__icon} aria-hidden="true">{offer.icon ?? '🛍️'}</span>
                  <span className={styles.spending__optionText}>
                    <strong>{offer.title}</strong>
                    <b>{money(offer.price)}</b>
                    {offer.yearlyCost !== null && <small>Расход — {money(offer.yearlyCost)} в год</small>}
                    {offer.durationMonths !== null && <small>Длительность — {offer.durationMonths} мес.</small>}
                    {offer.description !== null && offer.description !== formatSpendingEffects(offer.effects) && (
                      <small>{offer.description}</small>
                    )}
                    {formatSpendingEffects(offer.effects) && (
                      <small className={styles.spending__effects}>{formatSpendingEffects(offer.effects)}</small>
                    )}
                  </span>
                  <input
                    type="radio"
                    name="server-spending-option"
                    aria-label={offer.title}
                    checked={selected?.id === offer.id}
                    disabled={locked || loading}
                    onChange={() => setSelectedId(offer.id)}
                  />
                </label>
              ))}
            </div>
          </section>

          {categoryId === 'pets' && (
            <section className={styles.spending__card}>
              <h3><label htmlFor="server-pet-name">Кличка</label></h3>
              <input
                id="server-pet-name"
                className={styles.spending__name}
                value={currentPetName}
                maxLength={40}
                disabled={locked}
                onChange={(event) => setPetName(event.target.value)}
              />
              {shop.suggestedPetNames.length > 0 && (
                <button
                  type="button"
                  className={styles.spending__random}
                  disabled={locked}
                  onClick={() => {
                    const names = shop.suggestedPetNames;
                    setPetName(names[(names.indexOf(currentPetName) + 1) % names.length]);
                  }}
                >
                  🎲 Случайная кличка
                </button>
              )}
            </section>
          )}

          {selected && (
            <section className={styles.spending__card}>
              <h3>
                {selected.location
                  ? [selected.location.country, selected.location.city].filter(Boolean).join(' · ')
                  : `Выбрано: ${selected.title.toLocaleLowerCase('ru')}`}
              </h3>
              {selected.description !== null && <p>{selected.description}</p>}
              {selected.durationMonths !== null && (
                <p className={styles.spending__effects}>Длительность — {selected.durationMonths} мес.</p>
              )}
              <div className={styles.spending__row}>
                <span>Стоимость</span>
                <strong>{money(selected.price)}</strong>
              </div>
              <div className={styles.spending__row}>
                <span>После оплаты останется</span>
                <strong>{money(selected.balanceAfterPurchase)}</strong>
              </div>
            </section>
          )}

          {reason && <p className={styles.spending__error} role="status">{reason}</p>}
        </>
      )}

      {server.notice && <p role="status">{server.notice}</p>}
      {server.failure && (
        <section className={styles.spending__card}>
          <p className={styles.spending__error} role="alert">{server.failure.message}</p>
          {server.failure.retry && (
            <button
              type="button"
              className={styles.spending__back}
              disabled={server.busy}
              onClick={server.failure.retry}
            >
              Повторить покупку
            </button>
          )}
        </section>
      )}

      {shop?.confirmLabel !== null && shop && (
        <button
          type="button"
          className={styles.spending__confirm}
          disabled={Boolean(reason) || locked}
          onClick={confirm}
        >
          {server.busy ? 'Покупка…' : shop.confirmLabel}
        </button>
      )}
      <button type="button" className={styles.spending__back} onClick={onClose} disabled={server.busy}>
        Назад
      </button>
    </SpendingDialog>
  );
}
