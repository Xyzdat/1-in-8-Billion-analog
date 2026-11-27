import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { BudgetButton } from './BudgetPrimitives';
import styles from './Budget.module.scss';

type Props = {
  title: string;
  busy: boolean;
  disabled: boolean;
  onClose: () => void;
  onConfirm: () => void;
  failure?: { message: string; retry?: () => void } | null;
};

export default function BudgetQuitDialog({ title, busy, disabled, onClose, onConfirm, failure }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.budget__confirmation}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className={styles.budget}>
        <button
          type="button"
          className={styles.budget__close}
          aria-label="Закрыть подтверждение увольнения"
          disabled={busy}
          onClick={onClose}
        >
          <X size={24} />
        </button>
        <div className={styles.budget__hero}>
          <span className={styles.budget__icon} aria-hidden="true">💼</span>
          <h2 id={titleId}>Точно хочешь уволиться?</h2>
        </div>
        <p>Ты уйдёшь с работы «{title}» и больше не будешь получать эту зарплату.</p>
        <p className={styles.budget__notice}>Другие источники дохода сохранятся.</p>
        {failure && (
          <div role="alert">
            <p>{failure.message}</p>
            {failure.retry && (
              <BudgetButton variant="outline" disabled={busy} onClick={failure.retry}>
                Повторить запрос
              </BudgetButton>
            )}
          </div>
        )}
        {disabled && !busy && (
          <p role="status">Условия изменились. Вернись к доходам и проверь актуальную работу.</p>
        )}
        <BudgetButton onClick={onClose} disabled={busy}>Остаться на работе</BudgetButton>
        <BudgetButton variant="danger" onClick={onConfirm} disabled={busy || disabled}>
          Да, уволиться
        </BudgetButton>
      </div>
    </dialog>
  );
}
