import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, RefObject } from 'react';
import styles from './customScrollbar.module.scss';

type Props = {
  scrollContainerRef: RefObject<HTMLElement | null>;
};

function CustomScrollbar({ scrollContainerRef }: Props) {
  const [thumb, setThumb] = useState({
    height: 0,
    top: 0,
  });
  const [visible, setVisible] = useState(false);

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartTop = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);

  const cancelHide = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      if (!isDragging.current) setVisible(false);
    }, 700);
  }, [cancelHide]);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) return;

    const updateScrollbar = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const trackHeight = trackRef.current?.clientHeight ?? clientHeight;

      if (scrollHeight <= clientHeight || clientHeight === 0 || trackHeight === 0) {
        setThumb({ height: 0, top: 0 });
        setVisible(false);
        cancelHide();
        return;
      }

      const height = Math.min(trackHeight, Math.max(30, (clientHeight / scrollHeight) * trackHeight));
      const progress = Math.max(0, Math.min(1, scrollTop / (scrollHeight - clientHeight)));
      const top = progress * (trackHeight - height);

      setThumb((previous) => previous.height === height && previous.top === top
        ? previous
        : { height, top });
    };

    const handleScroll = () => {
      updateScrollbar();
      if (container.scrollHeight > container.clientHeight && container.clientHeight > 0) {
        setVisible(true);
        scheduleHide();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateScrollbar);

    const observer = new ResizeObserver(updateScrollbar);
    const observeContent = () => {
      observer.disconnect();
      observer.observe(container);
      [...container.children].forEach((child) => observer.observe(child));
      updateScrollbar();
    };
    const mutations = new MutationObserver(observeContent);
    mutations.observe(container, { childList: true, subtree: true, characterData: true });
    observeContent();

    return () => {
      cancelHide();
      isDragging.current = false;
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollbar);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [scrollContainerRef, cancelHide, scheduleHide]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();

    cancelHide();
    setVisible(true);
    isDragging.current = true;
    dragStartY.current = event.clientY;
    dragStartTop.current = thumb.top;

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;

    const container = scrollContainerRef.current;
    const track = trackRef.current;

    if (!container || !track) return;

    const trackHeight = track.clientHeight;
    const maxThumbTop = trackHeight - thumb.height;
    if (maxThumbTop <= 0) return;

    const scaleY = track.getBoundingClientRect().height / trackHeight;
    if (scaleY <= 0) return;
    const delta = (event.clientY - dragStartY.current) / scaleY;
    const newTop = Math.max(
      0,
      Math.min(maxThumbTop, dragStartTop.current + delta)
    );

    container.scrollTop =
      (newTop / maxThumbTop) *
      (container.scrollHeight - container.clientHeight);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    scheduleHide();
  };

  return (
    <div
      ref={trackRef}
      className={`${styles.scrollbar} ${visible && thumb.height > 0 ? styles['scrollbar--visible'] : ''}`}
      aria-hidden="true"
    >
      <div
        className={styles.scrollbar__thumb}
        style={{
          height: `${thumb.height}px`,
          transform: `translateY(${thumb.top}px)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
      />
    </div>
  );
}

export default CustomScrollbar;
