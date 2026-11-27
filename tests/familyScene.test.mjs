import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { birthAndLifeSession } from './fixtures/birthAndLifeSession.mjs';

const settings = { name: 'Герой', gender: 'Женщина', family: 'Полная семья', siblings: 'Один брат' };
const parent = birthAndLifeSession().simulation.family[0];
let vite;
let buildFamilyScene;
let familySceneSize;
before(async () => {
  vite = await createServer({
    cacheDir: 'node_modules/.vite-family-model-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  });
  ({ buildFamilyScene, familySceneSize } = await vite.ssrLoadModule('/src/game/familyScene.ts'));
});
after(async () => { await vite?.close(); });
const render = (options = {}) => buildFamilyScene({ settings, age: 0, ...options });

test('server family is authoritative, keeps same-name people by ID and never invents missing relatives', () => {
  const family = [
    { ...parent, id: 'mom-a' },
    { ...parent, id: 'mom-b' },
    { ...parent, id: 'sister-a', role: 'sister', age: 6 },
    { ...parent, id: 'sister-b', role: 'sister', age: 10 },
  ];
  const original = structuredClone(family);
  const scene = render({ family: [...family, family[0]] });
  assert.equal(scene.length, 5);
  assert.deepEqual(new Set(scene.filter((person) => person.id.startsWith('relative:mom')).map((person) => person.sprite)),
    new Set(['adult-woman-01', 'adult-woman-02']));
  assert.equal(scene.filter((person) => person.id.startsWith('relative:sister')).length, 2);
  assert.deepEqual(family, original);
  assert.deepEqual(render({ family: [] }).map((person) => person.id), ['protagonist']);
});

test('restoration and reordered snapshots preserve appearances, including a surviving same-role parent', () => {
  const family = [{ ...parent, id: 'a' }, { ...parent, id: 'b' }];
  const scene = render({ family });
  assert.deepEqual(render({ family: structuredClone(family).reverse() }), scene);
  const surviving = render({ family: [{ ...family[0], alive: false }, family[1]] });
  assert.equal(surviving.find((person) => person.id === 'relative:b').sprite,
    scene.find((person) => person.id === 'relative:b').sprite);
});

test('deceased and disconnected relatives disappear, parents remain despite their contact status', () => {
  const family = [
    { ...parent, id: 'mom', contact: { status: 'NO_CONTACT' } },
    { ...parent, id: 'dead', role: 'father', alive: false },
    { ...parent, id: 'rare', role: 'sister', contact: { status: 'RARE_CONTACT' } },
    { ...parent, id: 'lost', role: 'brother', contact: { status: 'NO_CONTACT' } },
    { ...parent, id: 'friend', role: 'friend' },
    { ...parent, id: 'partner', role: 'partner' },
    { ...parent, id: 'child', role: 'child', age: 6 },
  ];
  assert.deepEqual(new Set(render({ family }).map((person) => person.id)),
    new Set(['relative:mom', 'relative:partner', 'relative:child', 'protagonist']));
});

test('the protagonist grows through the available stages using the original character sex', () => {
  const expected = [[0, 'newborn'], [2, 'newborn'], [3, 'girl-age-03'], [6, 'girl-age-06'],
    [10, 'girl-age-10'], [17, 'girl-age-10'], [18, 'adult-woman-01'], [80, 'adult-woman-01']];
  for (const [age, sprite] of expected) {
    assert.equal(render({ age, family: [] }).at(-1).sprite, sprite);
  }
  assert.equal(render({ age: 6, settings: { ...settings, gender: 'MALE' }, family: [] }).at(-1).sprite, 'boy-age-06');
  assert.equal(render({ age: 6, settings: { ...settings, gender: 'FEMALE' }, family: [] }).at(-1).sprite, 'girl-age-06');
});

test('siblings use their actual sex and age and adult siblings use adult figures', () => {
  const family = [
    { ...parent, id: 'young', role: 'brother', age: 3 },
    { ...parent, id: 'school', role: 'sibling', age: 6, sex: 'FEMALE' },
    { ...parent, id: 'older', role: 'sister', age: 12 },
    { ...parent, id: 'adult', role: 'brother', age: 23 },
  ];
  const scene = render({ family });
  assert.equal(scene.find((person) => person.id === 'relative:young').sprite, 'boy-age-03');
  assert.equal(scene.find((person) => person.id === 'relative:school').sprite, 'girl-age-06');
  assert.equal(scene.find((person) => person.id === 'relative:older').sprite, 'girl-age-10');
  assert.match(scene.find((person) => person.id === 'relative:adult').sprite, /^adult-man-/);
});

test('birth details support two dads, nullable fields and explicit zero siblings without mocks leaking in', () => {
  const birth = { familyType: 'TWO_FATHERS', siblings: [] };
  const scene = render({ birth });
  assert.equal(scene.length, 3);
  assert.deepEqual(new Set(scene.slice(0, -1).map((person) => person.sprite)),
    new Set(['adult-man-01', 'adult-man-02']));
  assert.equal(render({ birth: null, settings: { name: 'Герой' } }).length, 1);
  assert.equal(render({ birth: { familyType: 'MOTHER_AND_FATHER', fatherPresent: false, siblings: [] } }).length, 2);
  assert.equal(render({ birth: { household: { mother: false, father: false }, siblings: [] } }).length, 1);
});

test('birth sibling ages advance with the hero and absent household members are omitted', () => {
  const scene = render({
    age: 3,
    settings: { name: 'Герой' },
    birth: { siblings: [{ age: 3, sex: 'FEMALE' }, { age: 10, sex: 'MALE', livesWithChild: false }] },
  });
  assert.equal(scene.find((person) => person.id === 'birth:sibling:0').sprite, 'girl-age-06');
  assert.equal(scene.length, 2);
});

test('legacy birth sibling counts are used when detailed relatives are unavailable, including zero', () => {
  assert.equal(render({ birth: { olderSiblingCount: 0 } }).length, 3);
  assert.equal(render({ birth: { olderSiblingCount: 5 } }).length, 8);
  assert.equal(render({ birth: { household: { siblings: 3 } } }).length, 6);
  assert.equal(render({ birth: { olderSiblingCount: 5, siblings: [] } }).length, 3);
});

test('mocks use selected family composition and the shared sibling age', () => {
  for (const [family, count, prefix] of [
    ['Только мама', 1, 'adult-woman-'], ['Только папа', 1, 'adult-man-'],
    ['Две мамы', 2, 'adult-woman-'], ['Два папы', 2, 'adult-man-'],
  ]) {
    const scene = render({ settings: { ...settings, family, siblings: 'Нет' }, mock: true });
    assert.equal(scene.length, count + 1);
    for (const person of scene.slice(0, -1)) assert(person.sprite.startsWith(prefix));
  }
  const scene = render({ mock: true, settings: { ...settings, siblings: 'Брат и сестра' } });
  assert.equal(scene.length, 5);
  assert.equal(scene.find((person) => person.id === 'birth:sibling:0').sprite, 'boy-age-03');
  assert.equal(scene.find((person) => person.id === 'birth:sibling:1').sprite, 'girl-age-03');
});

test('large families retain every person within the image instead of truncating the siblings', () => {
  for (const count of [10, 25]) {
    const family = [parent, { ...parent, id: 'dad', role: 'father' }, ...Array.from({ length: count }, (_, index) => ({
      ...parent, id: `sibling-${index}`, role: index % 2 ? 'sister' : 'brother', age: 3 + index,
    }))];
    const scene = render({ family });
    assert.equal(scene.length, count + 3);
    for (const person of scene) {
      assert(person.x >= 0 && person.y >= 0, person.id);
      assert(person.x + person.width <= familySceneSize.width, person.id);
      assert(person.y + person.height <= familySceneSize.height, person.id);
    }
  }
});

test('all selected sprites match the generated asset catalog', () => {
  const manifest = JSON.parse(readFileSync(new URL('../src/assets/birth-scene/pixel-prototype/family-manifest.json', import.meta.url)));
  const catalog = new Map(manifest.sprites.map((sprite) => [sprite.id, sprite]));
  const family = Array.from({ length: 20 }, (_, index) => ({
    ...parent, id: `member-${index}`, role: index % 2 ? 'sister' : 'brother', age: index,
  }));
  for (const person of render({ family })) assert(catalog.has(person.sprite), person.sprite);
  for (const age of [0, 3, 6, 10, 18]) {
    const person = render({ age, family: [] }).at(-1);
    const sprite = catalog.get(person.sprite);
    if (person.sprite === 'newborn') {
      assert(person.width < sprite.width);
      assert(person.height < sprite.height);
    } else {
      assert.equal(person.width, sprite.width);
      assert.equal(person.height, sprite.height);
    }
  }
});

test('appearance survives restore, growth, renaming and adding or removing other relatives', () => {
  const family = [parent, { ...parent, id: 'sibling', role: 'sister', age: 6 }];
  const scene = render({ family, sessionId: 'appearance-life' });
  const appearanceById = new Map(scene.map((person) => [person.id, person.appearance]));
  const skinTones = Object.fromEntries(scene.map((person) => [person.id, person.appearance.skinId]));
  const changed = render({
    family: [{ ...family[1], name: 'Другое имя', age: 20 }],
    age: 18,
    settings: { ...settings, name: 'Новое имя' },
    sessionId: 'appearance-life',
    skinTones,
  });
  for (const person of changed) assert.deepEqual(person.appearance, appearanceById.get(person.id));
  const restored = render({ family: JSON.parse(JSON.stringify(family)).reverse(), sessionId: 'appearance-life' });
  for (const person of restored) assert.deepEqual(person.appearance, appearanceById.get(person.id));
  const otherLife = render({ family, sessionId: 'different-life' });
  assert.notDeepEqual(otherLife.at(-1).appearance, scene.at(-1).appearance);
});

test('server genealogy links character, partner, child and grandchild, including cached absent ancestors', () => {
  const family = [
    { ...parent, id: 'partner', role: 'partner' },
    { ...parent, id: 'child', role: 'child', age: 4 },
    { ...parent, id: 'grandchild', role: 'grandchild', age: 0 },
  ];
  const adult = {
    npcs: {
      partner: { id: 'partner', parentIds: [], countryIso2: 'RU' },
      child: { id: 'child', parentIds: ['character', 'partner'], countryIso2: 'JP' },
      grandchild: { id: 'grandchild', parentIds: ['child', 'absent-parent'], countryIso2: 'JP' },
    },
  };
  const skinTones = { protagonist: 'deep', 'relative:partner': 'light', 'relative:absent-parent': 'deep' };
  const scene = render({ family, adult, age: 45, countryCode: 'RU', skinTones });
  const child = scene.find((person) => person.id === 'relative:child');
  const grandchild = scene.find((person) => person.id === 'relative:grandchild');
  assert(['warm', 'tan'].includes(child.appearance.skinId));
  assert(['tan', 'brown'].includes(grandchild.appearance.skinId));
  assert.equal(scene.at(-1).appearance.skinId, 'deep');
});

test('birth country stays authoritative and known parent tones remain available after their death', () => {
  const family = [{ ...parent, alive: false }];
  const original = structuredClone(family);
  const options = {
    family,
    countryCode: 'JP',
    settings: { ...settings, country: 'Нигерия' },
    sessionId: 'birth-country',
    skinTones: { [`relative:${parent.id}`]: 'warm' },
  };
  const scene = render(options);
  assert.equal(scene.length, 1);
  assert(['peach', 'warm', 'tan'].includes(scene[0].appearance.skinId));
  assert.deepEqual(render({ ...options, settings: { ...settings, country: 'Россия' } }), scene);
  assert.deepEqual(family, original);
});
