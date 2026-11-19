import { useEffect, useRef, useState } from 'react';
import styles from './customScrollbar.module.scss';

function CustomScrollbar({ scrollContainerRef }) {
  const [thumb, setThumb] = useState({
    height: 0,
    top: 0,
  });

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartTop = useRef(0);
  const trackRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) return;

    const updateScrollbar = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      if (scrollHeight <= clientHeight) {
        setThumb({ height: 0, top: 0 });
        return;
      }

      const height = (clientHeight / scrollHeight) * clientHeight;
      const top =
        (scrollTop / (scrollHeight - clientHeight)) *
        (clientHeight - height);

      setThumb({ height, top });
    };

    updateScrollbar();

    container.addEventListener('scroll', updateScrollbar);
    window.addEventListener('resize', updateScrollbar);

    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollbar);
      window.removeEventListener('resize', updateScrollbar);
      observer.disconnect();
    };
  }, [scrollContainerRef]);

  const handlePointerDown = (event) => {
    event.preventDefault();

    isDragging.current = true;
    dragStartY.current = event.clientY;
    dragStartTop.current = thumb.top;

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!isDragging.current) return;

    const container = scrollContainerRef.current;
    const track = trackRef.current;

    if (!container || !track) return;

    const trackHeight = track.clientHeight;
    const maxThumbTop = trackHeight - thumb.height;

    const delta = event.clientY - dragStartY.current;
    const newTop = Math.max(
      0,
      Math.min(maxThumbTop, dragStartTop.current + delta)
    );

    container.scrollTop =
      (newTop / maxThumbTop) *
      (container.scrollHeight - container.clientHeight);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  if (!thumb.height) return null;

  return (
    <div ref={trackRef} className={styles.scrollbar}>
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
      />
    </div>
  );
}

export default CustomScrollbar;