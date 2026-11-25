import { useState } from 'react';

export function readLifeFavorites(sessionId?: string, storage?: Pick<Storage, 'getItem'>): string[] {
  if (!sessionId) return [];
  try {
    const source = storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
    const saved: unknown = JSON.parse(source?.getItem(`life.favorites.${sessionId}`) ?? '[]');
    return Array.isArray(saved) ? [...new Set(saved.filter((id): id is string => typeof id === 'string'))] : [];
  } catch {
    return [];
  }
}

export function useLifeFavorites(sessionId?: string) {
  const [saved, setSaved] = useState(() => ({ id: sessionId, values: readLifeFavorites(sessionId) }));
  const favorites = saved.id === sessionId ? saved.values : readLifeFavorites(sessionId);

  function toggleFavorite(id: string) {
    const previous = saved.id === sessionId ? saved.values : readLifeFavorites(sessionId);
    const values = previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id];
    try {
      if (sessionId && typeof window !== 'undefined') window.localStorage.setItem(`life.favorites.${sessionId}`, JSON.stringify(values));
    } catch {
      // Локальное избранное остаётся доступным, даже если браузер запретил сохранение.
    }
    setSaved({ id: sessionId, values });
  }

  return { favorites, toggleFavorite };
}
