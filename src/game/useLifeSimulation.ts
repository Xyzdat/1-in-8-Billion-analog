import { useEffect, useRef, useState } from 'react';
import { advanceUntilDecision, buyItem, END_AGE, END_MS, getSnapshot, nextDecision, YEAR_MS } from './simulation';
import type { GameChoices } from './simulation';
import type { FocusId } from '../mocks/gameChoices';
import type { GameStats } from '../mocks/lifeEvents';
import type { ShopSection } from '../mocks/spendingCatalog';

export function useLifeSimulation(initial: GameStats, initialAppearance = 64) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(false);
  const [choices, setChoices] = useState<GameChoices>({ answers: {}, focus: {} });
  const choicesRef = useRef<GameChoices>({ answers: {}, focus: {} });
  const clock = useRef({ elapsed: 0, last: 0, paused: false, speed: 1 });
  const blocked = useRef(false);
  const purchaseSequence = useRef(0);

  function sync(now: number) {
    const state = clock.current;
    const result = advanceUntilDecision(state.elapsed, now - state.last, state.speed, state.paused || blocked.current, choicesRef.current);
    const barrier = result.decision;
    state.elapsed = result.elapsed;
    if (barrier && autoRef.current && !blocked.current) {
      choicesRef.current = { ...choicesRef.current, answers: { ...choicesRef.current.answers, [barrier.id]: 0 } };
      setChoices(choicesRef.current);
    }
    state.last = now;
    return state.elapsed;
  }

  useEffect(() => {
    clock.current.last = performance.now();
    const timer = window.setInterval(() => {
      const value = sync(performance.now());
      setElapsed(value);
      if (value === END_MS) window.clearInterval(timer);
    }, 50);
    return () => window.clearInterval(timer);
  }, []);

  function changeSpeed(value: number) {
    setElapsed(sync(performance.now()));
    clock.current.speed = value;
    setSpeed(value);
  }

  function togglePause() {
    setElapsed(sync(performance.now()));
    clock.current.paused = !clock.current.paused;
    setPaused(clock.current.paused);
  }

  function chooseFocus(value: FocusId) {
    const time = sync(performance.now());
    const age = Math.floor(time / YEAR_MS);
    if (age < 3 || time === END_MS) return;
    choicesRef.current = { ...choicesRef.current, focus: { ...choicesRef.current.focus, [age]: value } };
    setChoices(choicesRef.current);
    setElapsed(time);
  }

  function answerDecision(index: number) {
    const decision = nextDecision(clock.current.elapsed, choicesRef.current.answers, choicesRef.current.deferred);
    if (!decision?.options[index]) return;
    choicesRef.current = { ...choicesRef.current, answers: { ...choicesRef.current.answers, [decision.id]: index } };
    clock.current.last = performance.now();
    setChoices(choicesRef.current);
  }

  function toggleAuto() {
    autoRef.current = !autoRef.current;
    setAuto(autoRef.current);
    if (autoRef.current) answerDecision(0);
  }

  function deferDecision() {
    const time = sync(performance.now());
    const decision = nextDecision(time, choicesRef.current.answers, choicesRef.current.deferred);
    if (!decision || !decision.important || time >= END_MS) return;
    choicesRef.current = { ...choicesRef.current, deferred: { ...choicesRef.current.deferred, [decision.id]: Math.min(END_AGE, time / YEAR_MS + 0.25) } };
    setChoices(choicesRef.current);
    setElapsed(time);
  }

  function blockTime(value: boolean) {
    setElapsed(sync(performance.now()));
    if (value && nextDecision(clock.current.elapsed, choicesRef.current.answers, choicesRef.current.deferred)) {
      return false;
    }
    blocked.current = value;
    return true;
  }

  function purchase(section: ShopSection, itemId: string, country: string, petName?: string) {
    const time = sync(performance.now());
    purchaseSequence.current += 1;
    const result = buyItem(time, initial, choicesRef.current, {
      id: `purchase-${purchaseSequence.current}`,
      age: time / YEAR_MS,
      section,
      itemId,
      country,
      petName,
    });
    if (result.error) return result.error;
    choicesRef.current = result.choices;
    setChoices(result.choices);
    setElapsed(time);
    return '';
  }

  return { ...getSnapshot(elapsed, initial, choices, initialAppearance), elapsed, paused, speed, changeSpeed, togglePause,
    purchases: choices.purchases || [], blockTime, purchase,
    focus: choices.focus[Math.floor(elapsed / YEAR_MS)] || 'balanced', chooseFocus,
    auto, toggleAuto, deferDecision,
    decision: nextDecision(elapsed, choices.answers, choices.deferred), answerDecision };
}
