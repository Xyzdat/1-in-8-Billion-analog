import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countrySkinWeights } from '../src/data/appearanceCountryProfiles.ts';
import { supportedCountries } from '../src/data/supportedCountries.ts';
import { skinToneIds, isSkinToneId, getFamilyAppearance, withFamilySkin } from '../src/game/familyAppearance.ts';
import { resolveFamilySkinTones } from '../src/game/familySkin.ts';
import { readFamilySkinTones, saveFamilySkinTones } from '../src/game/useFamilySkinMemory.ts';

test('all 36 countries accept ISO2, ISO3 and names and retain multiple possible skin tones', () => {
  for (const country of supportedCountries) {
    const weights = countrySkinWeights(country.iso2);
    assert.deepEqual(countrySkinWeights(country.iso3), weights);
    assert.deepEqual(countrySkinWeights(country.name), weights);
    assert.equal(weights.length, skinToneIds.length);
    assert.equal(weights.reduce((sum, value) => sum + value, 0), 100);
    assert(weights.every((value) => value > 0));
  }
  assert.notDeepEqual(countrySkinWeights('JP'), countrySkinWeights('NG'));
  assert.deepEqual(countrySkinWeights('unknown-country'), countrySkinWeights(null));
});

test('country changes the weighted selection without forcing every resident to have one tone', () => {
  const people = Array.from({ length: 1000 }, (_, index) => ({ id: `person-${index}`, parentIds: [] }));
  const northern = resolveFamilySkinTones(people, 'country-example', 'RU');
  const equatorial = resolveFamilySkinTones(people, 'country-example', 'NG');
  const mean = (tones) => Object.values(tones).reduce((sum, tone) => sum + skinToneIds.indexOf(tone), 0) / people.length;
  assert(mean(equatorial) > mean(northern) + 2);
  assert(new Set(Object.values(northern)).size > 3);
  assert(new Set(Object.values(equatorial)).size > 3);
});

test('children resemble both known parents with small variation, and country does not override parents', () => {
  const children = Array.from({ length: 30 }, (_, index) => ({ id: `child-${index}`, parentIds: ['mother', 'father'] }));
  const people = [{ id: 'mother', parentIds: [] }, { id: 'father', parentIds: [] }, ...children];
  const saved = { mother: 'tan', father: 'tan' };
  const scene = resolveFamilySkinTones(people, 'inheritance', 'RU', saved);
  for (const child of children) assert(Math.abs(skinToneIds.indexOf(scene[child.id]) - 3) <= 1);
  assert(new Set(children.map((child) => scene[child.id])).size > 1);
  assert.deepEqual(resolveFamilySkinTones(people, 'inheritance', 'NG', saved), scene);
  const mixed = resolveFamilySkinTones(people, 'inheritance', 'JP', { mother: 'light', father: 'deep' });
  for (const child of children) assert(['warm', 'tan'].includes(mixed[child.id]));
});

test('single-parent, unknown-parent and multigeneration links resolve safely in any order', () => {
  const people = [
    { id: 'mother', parentIds: [] },
    { id: 'protagonist', parentIds: ['mother'] },
    { id: 'partner', parentIds: [], countryCode: 'NG' },
    { id: 'child', parentIds: ['protagonist', 'partner'] },
    { id: 'grandchild', parentIds: ['child'] },
    { id: 'unknown', parentIds: ['not-provided'] },
  ];
  const saved = { mother: 'peach' };
  const first = resolveFamilySkinTones(people, 'generation', 'JP', saved);
  assert.deepEqual(resolveFamilySkinTones([...people].reverse(), 'generation', 'JP', saved), first);
  assert(Math.abs(skinToneIds.indexOf(first.protagonist) - 1) <= 1);
  assert(Math.abs(skinToneIds.indexOf(first.grandchild) - skinToneIds.indexOf(first.child)) <= 1);
  assert(Object.values(first).every(isSkinToneId));
  assert(Object.values(resolveFamilySkinTones([
    { id: 'a', parentIds: ['b'] }, { id: 'b', parentIds: ['a'] }, { id: 'self', parentIds: ['self'] },
  ], 'cycle', 'IN')).every(isSkinToneId));
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test('skin memory survives F5 and preserves first assignments after moves and missing parents', () => {
  const storage = memoryStorage();
  const people = [{ id: 'mother', parentIds: [] }, { id: 'child', parentIds: ['mother'] }];
  const first = resolveFamilySkinTones(people, 'saved-life', 'JP');
  saveFamilySkinTones('saved-life', first, storage);
  const recovered = readFamilySkinTones('saved-life', storage);
  assert.deepEqual(recovered, first);
  assert.deepEqual(resolveFamilySkinTones([{ id: 'child', parentIds: [] }], 'saved-life', 'NG', recovered), first);
  assert.deepEqual(saveFamilySkinTones('saved-life', { child: 'deep', newRelative: 'warm' }, storage), { ...first, newRelative: 'warm' });
  assert.deepEqual(readFamilySkinTones('other-life', storage), {});
});

test('invalid or unavailable storage falls back safely and cannot introduce unsupported tones', () => {
  assert.deepEqual(readFamilySkinTones('life', { getItem: () => '{broken' }), {});
  assert.deepEqual(readFamilySkinTones('life', { getItem: () => JSON.stringify({ version: 1, tones: { p: 'warm' } }) }), {});
  assert.deepEqual(readFamilySkinTones('life', { getItem: () => JSON.stringify({ version: 2, tones: { valid: 'warm', invalid: '#abcdef' } }) }), { valid: 'warm' });
  const blocked = { getItem() { throw new Error('Unavailable'); }, setItem() { throw new Error('Unavailable'); } };
  assert.deepEqual(readFamilySkinTones('life', blocked), {});
  assert.deepEqual(saveFamilySkinTones('life', { p: 'warm' }, blocked), { p: 'warm' });
  assert.deepEqual(readFamilySkinTones(undefined, memoryStorage()), {});
});

test('changing skin preserves the established hair, clothing, pixel slots and original v1 profile', () => {
  const original = getFamilyAppearance('life', 'person');
  const before = structuredClone(original);
  const changed = withFamilySkin(original, 'deep');
  assert.equal(changed.skinId, 'deep');
  assert.match(changed.id, /^v2:/);
  for (const key of ['hairId', 'shirtId', 'trousersId']) assert.equal(changed[key], original[key]);
  for (const key of ['hair', 'hairShade', 'hairLight', 'shirt', 'shirtShade', 'shirtLight', 'trousers', 'trouserShade']) {
    assert.equal(changed.colors[key], original.colors[key]);
  }
  assert.deepEqual(original, before);
});
