import { useCallback, useState } from 'react';
import { isSkinToneId } from './familyAppearance.ts';
import type { FamilySkinTones } from './familySkin.ts';

type SkinStorage = Pick<Storage, 'getItem' | 'setItem'>;

function storageKey(sessionId: string) {
  return `life.family-skin.v2.${sessionId}`;
}

export function readFamilySkinTones(sessionId?: string, storage?: Pick<SkinStorage, 'getItem'>): FamilySkinTones {
  if (!sessionId) return {};
  try {
    const source = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    const saved = JSON.parse(source?.getItem(storageKey(sessionId)) ?? 'null');
    if (saved?.version !== 2 || !saved.tones || typeof saved.tones !== 'object' || Array.isArray(saved.tones)) return {};
    return Object.fromEntries(Object.entries(saved.tones).filter((entry) => isSkinToneId(entry[1]))) as FamilySkinTones;
  } catch {
    return {};
  }
}

export function saveFamilySkinTones(sessionId: string | undefined, tones: FamilySkinTones, storage?: SkinStorage): FamilySkinTones {
  const values = { ...tones, ...readFamilySkinTones(sessionId, storage) };
  try {
    const target = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    if (sessionId) target?.setItem(storageKey(sessionId), JSON.stringify({ version: 2, tones: values }));
  } catch {
    // The same appearance remains available in memory when browser storage is unavailable.
  }
  return values;
}

function sameTones(first: FamilySkinTones, second: FamilySkinTones) {
  return Object.keys(first).length === Object.keys(second).length
    && Object.entries(first).every(([id, tone]) => second[id] === tone);
}

export function useFamilySkinMemory(sessionId?: string) {
  const [saved, setSaved] = useState(() => ({ sessionId, tones: readFamilySkinTones(sessionId) }));
  const tones = saved.sessionId === sessionId ? saved.tones : readFamilySkinTones(sessionId);
  const remember = useCallback((generated: FamilySkinTones) => {
    const merged = { ...generated, ...tones };
    if (saved.sessionId === sessionId && sameTones(tones, merged)) return;
    const values = saveFamilySkinTones(sessionId, merged);
    setSaved({ sessionId, tones: values });
  }, [sessionId, saved.sessionId, tones]);

  return { tones, remember };
}
