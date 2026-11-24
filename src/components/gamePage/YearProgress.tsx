import { useLayoutEffect, useRef, useState } from 'react';

type Props = {
  value: number;
  paused: boolean;
};

const ANIMATION_MS = 1;

export default function YearProgress({ value, paused }: Props) {
  const current = useRef(value);
  const [displayed, setDisplayed] = useState(value);

  useLayoutEffect(() => {
    const from = current.current;

    // Пауза и начало нового года фиксируются сразу, без обратной анимации.
    if (paused || value <= from) {
      current.current = value;
      setDisplayed(value);
      return;
    }

    const started = performance.now();
    let frame: number;

    const animate = (now: number) => {
      const fraction = Math.min(1, Math.max(0, (now - started) / ANIMATION_MS));
      current.current = from + (value - from) * fraction;
      setDisplayed(current.current);

      if (fraction < 1) {
        frame = window.requestAnimationFrame(animate);
      }
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [value, paused]);

  return (
    <progress
      max={1}
      value={displayed}
      aria-label="Прогресс текущего года"
    />
  );
}
