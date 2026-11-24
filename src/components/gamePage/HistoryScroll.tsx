import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import CustomScrollbar from '../customScrollbar/customScrollbar.tsx';
import styles from './HistoryScroll.module.scss';

type Props = {
  children: ReactNode;
  label: string;
  visibleRows: number;
  className?: string;
};

export default function HistoryScroll({ children, label, visibleRows, className = '' }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;

    const measure = () => {
      if (!element.getClientRects().length) return;
      const rows = [...element.children].slice(0, visibleRows) as HTMLElement[];
      const first = rows[0];
      const last = rows[rows.length - 1];

      // Размеры разметки не зависят от экранного масштаба и позиции прокрутки.
      const next = first && last
        ? last.offsetTop + last.offsetHeight - first.offsetTop
        : 0;
      setHeight((previous) => previous === next ? previous : next);
    };
    const resize = new ResizeObserver(measure);
    const observeRows = () => {
      resize.disconnect();
      resize.observe(element);
      [...element.children].slice(0, visibleRows).forEach((row) => resize.observe(row));
      measure();
    };
    const mutations = new MutationObserver(observeRows);
    mutations.observe(element, { childList: true, subtree: true, characterData: true });
    observeRows();

    return () => {
      resize.disconnect();
      mutations.disconnect();
    };
  }, [visibleRows]);

  return (
    <div className={styles.historyScroll}>
      <div
        ref={container}
        className={`${styles.historyScroll__viewport} ${className}`}
        style={{ height, maxHeight: height }}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>
      <CustomScrollbar scrollContainerRef={container} />
    </div>
  );
}
