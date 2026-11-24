export const AUTO_DECISION_DELAY_MS = 3000;

type Scheduler = {
  now: () => number;
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clear: (handle: ReturnType<typeof setTimeout>) => void;
};

const realTime: Scheduler = {
  now: () => performance.now(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  clear: (handle) => clearTimeout(handle),
};

export function scheduleAutoDecision(
  onChoose: () => void,
  onCountdown: (seconds: number) => void,
  scheduler: Scheduler = realTime,
) {
  const deadline = scheduler.now() + AUTO_DECISION_DELAY_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let previousSeconds = 3;
  onCountdown(previousSeconds);

  const tick = () => {
    if (stopped) return;
    const remaining = Math.max(0, deadline - scheduler.now());
    const seconds = Math.ceil(remaining / 1000);
    if (seconds !== previousSeconds) {
      previousSeconds = seconds;
      onCountdown(seconds);
    }
    if (remaining === 0) {
      stopped = true;
      onChoose();
      return;
    }
    timer = scheduler.schedule(tick, Math.min(100, remaining));
  };

  timer = scheduler.schedule(tick, 100);
  return () => {
    stopped = true;
    if (timer !== undefined) scheduler.clear(timer);
  };
}
