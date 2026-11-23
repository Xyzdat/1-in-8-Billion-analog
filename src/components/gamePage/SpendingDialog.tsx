import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './SpendingPanel.module.scss';

type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onBlockTime: (blocked: boolean) => void;
  busy?: boolean;
};

export default function SpendingDialog({ title, children, onClose, onBlockTime, busy = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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
      previousFocus?.focus({ preventScroll: true });
    };
    // Blocking and scroll locking belong to the lifetime of this dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.spending}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className={styles.spending__content}>
        <header className={styles.spending__header}>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Вернуться в игру">
            ←
          </button>
          <h1 id={titleId}>{title}</h1>
        </header>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
