import { countrySkinWeights } from '../data/appearanceCountryProfiles.ts';
import { chooseFamilySkin, isSkinToneId, skinToneIds } from './familyAppearance.ts';
import type { SkinToneId } from './familyAppearance.ts';

export type FamilySkinPerson = {
  id: string;
  parentIds: readonly string[];
  countryCode?: string | null;
};

export type FamilySkinTones = Record<string, SkinToneId>;

export function resolveFamilySkinTones(
  people: readonly FamilySkinPerson[],
  sessionId?: string,
  countryCode?: string | null,
  saved: FamilySkinTones = {},
): FamilySkinTones {
  const records = new Map(people.map((person) => [person.id, person]));
  const locked = Object.fromEntries(Object.entries(saved).filter((entry) => isSkinToneId(entry[1]))) as FamilySkinTones;
  const resolved: FamilySkinTones = {};
  const visiting = new Set<string>();

  function resolve(id: string): SkinToneId | undefined {
    if (Object.hasOwn(locked, id)) return locked[id];
    if (Object.hasOwn(resolved, id)) return resolved[id];
    const person = records.get(id);
    if (!person || visiting.has(id)) return undefined;
    visiting.add(id);

    const parents = [...new Set(person.parentIds)].filter((parentId) => parentId !== id)
      .map(resolve).filter((tone): tone is SkinToneId => tone !== undefined);
    let weights: readonly number[];
    if (parents.length > 0) {
      // A visual family resemblance, not a genetic or ancestry calculation.
      const center = parents.reduce((sum, tone) => sum + skinToneIds.indexOf(tone), 0) / parents.length;
      weights = skinToneIds.map((_, index) => Math.max(0, Math.round((1.25 - Math.abs(index - center)) * 20)));
    } else {
      weights = countrySkinWeights(person.countryCode ?? countryCode);
    }
    const tone = chooseFamilySkin(sessionId, id, weights);
    resolved[id] = tone;
    visiting.delete(id);
    return tone;
  }

  for (const id of [...records.keys()].sort()) resolve(id);
  return { ...resolved, ...locked };
}
