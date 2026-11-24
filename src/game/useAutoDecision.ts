import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { scheduleAutoDecision } from './autoDecision';

type Props = {
  enabled: boolean;
  decisionKey: string | null;
  blocked: boolean;
  onChoose: () => void;
};

export function useAutoDecision({ enabled, decisionKey, blocked, onChoose }: Props) {
  const currentTimer = useRef<(() => void) | null>(null);
  const attempted = useRef<string | null>(null);
  const [countdown, setCountdown] = useState({ key: decisionKey, seconds: 3 });
  const choose = useEffectEvent((expectedKey: string) => {
    if (enabled && !blocked && decisionKey === expectedKey) onChoose();
  });
  const cancel = useCallback(() => {
    currentTimer.current?.();
    currentTimer.current = null;
  }, []);

  useEffect(() => {
    cancel();
    if (!enabled) attempted.current = null;
    if (!enabled || !decisionKey || blocked || attempted.current === decisionKey) return;
    const stop = scheduleAutoDecision(() => {
      attempted.current = decisionKey;
      choose(decisionKey);
    }, (seconds) => {
      setCountdown((previous) => previous.key === decisionKey && previous.seconds === seconds
        ? previous : { key: decisionKey, seconds });
    });
    currentTimer.current = stop;
    return stop;
  }, [enabled, decisionKey, blocked, cancel]);

  return {
    cancel,
    seconds: enabled && decisionKey && !blocked
      ? countdown.key === decisionKey ? countdown.seconds : 3
      : null,
  };
}
