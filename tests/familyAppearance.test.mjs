import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { getFamilyAppearance } from '../src/game/familyAppearance.ts';
import { familySpriteLayers } from '../src/data/familySpriteLayers.ts';

test('appearance is reproducible from life and person IDs without saved browser state', () => {
  assert.equal(getFamilyAppearance('life-stable-example', 'relative:mother').id, 'v1:warm:golden:sky:sand');
  const first = getFamilyAppearance('life-one', 'relative:sibling-0');
  assert.deepEqual(getFamilyAppearance('life-one', 'relative:sibling-0'), first);
  assert.notEqual(getFamilyAppearance('life-two', 'relative:sibling-0').id, first.id);
  assert.notEqual(getFamilyAppearance('life-one', 'relative:sibling-1').id, first.id);
  assert.deepEqual(getFamilyAppearance(undefined, 'protagonist'), getFamilyAppearance(undefined, 'protagonist'));
  first.colors.skin = '#000000';
  assert.notEqual(getFamilyAppearance('life-one', 'relative:sibling-0').colors.skin, '#000000');
});

test('the available colors cover every palette and give the initial family different appearances', () => {
  const profiles = Array.from({ length: 512 }, (_, index) => getFamilyAppearance('palette-sample', `relative:${index}`));
  assert.equal(new Set(profiles.map((profile) => profile.skinId)).size, 6);
  assert.equal(new Set(profiles.map((profile) => profile.hairId)).size, 6);
  assert.equal(new Set(profiles.map((profile) => profile.shirtId)).size, 8);
  assert.equal(new Set(profiles.map((profile) => profile.trousersId)).size, 6);
  for (const profile of profiles) {
    for (const color of Object.values(profile.colors)) assert.match(color, /^#[0-9a-f]{6}$/);
  }
  const family = ['mother', 'father', ...Array.from({ length: 10 }, (_, index) => `sibling-${index}`)];
  const appearances = family.map((id) => getFamilyAppearance('life-stable-example', `relative:${id}`).id);
  assert.equal(new Set(appearances).size, family.length);
});

test('v1 appearance assignments are frozen so palette updates cannot silently change existing lives', () => {
  const ids = Array.from({ length: 128 }, (_, index) => getFamilyAppearance('v1-contract', `relative:${index}`).id);
  const fingerprint = createHash('sha256').update(ids.join('\n')).digest('hex');
  assert.equal(fingerprint, '0c9b5d9d4d60bceaa0cdd0235ad8e7a45b24a185dd136c11ba8a67944f4c2a9e');
});

function pngPixels(file) {
  const bytes = readFileSync(file);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.equal(bytes[25], 6, 'Sprites must have RGBA pixels');
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    assert.equal(raw[row], 0, 'The generator writes unfiltered PNG rows');
    raw.copy(pixels, y * width * 4, row + 1, row + 1 + width * 4);
  }
  return { width, height, pixels };
}

test('recolorable layers preserve every sprite pixel, transparency and fixed-color details', () => {
  const directory = new URL('../src/assets/birth-scene/pixel-prototype/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('family-manifest.json', directory)));
  const profile = getFamilyAppearance('life-one', 'protagonist');
  for (const sprite of manifest.sprites) {
    const template = familySpriteLayers[sprite.id];
    const source = pngPixels(new URL(sprite.file, directory));
    assert.equal(template.width, source.width);
    assert.equal(template.height, source.height);
    const coverage = new Uint8Array(source.width * source.height);
    const slots = new Set();
    for (const layer of template.layers) {
      if ('slot' in layer) {
        slots.add(layer.slot);
        assert(profile.colors[layer.slot], `Missing color slot: ${layer.slot}`);
      }
      const rectangles = [...layer.path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)];
      assert.equal(rectangles.map((match) => match[0]).join(''), layer.path);
      for (const [, xValue, yValue, lengthValue] of rectangles) {
        const x = Number(xValue);
        const y = Number(yValue);
        const length = Number(lengthValue);
        assert(x >= 0 && y >= 0 && y < source.height && x + length <= source.width);
        for (let dx = 0; dx < length; dx += 1) {
          const pixel = y * source.width + x + dx;
          assert.equal(coverage[pixel], 0, 'Color layers must not overlap');
          coverage[pixel] = 1;
          assert.equal(source.pixels[pixel * 4 + 3], 255, 'Layers must not fill transparent pixels');
          if ('color' in layer) {
            assert.equal('#' + source.pixels.subarray(pixel * 4, pixel * 4 + 3).toString('hex'), layer.color);
          }
        }
      }
    }
    for (const slot of ['skin', 'skinShade', 'hair', 'shirt', 'shirtShade']) assert(slots.has(slot), `${sprite.id}: ${slot}`);
    for (let pixel = 0; pixel < coverage.length; pixel += 1) {
      assert.equal(coverage[pixel], source.pixels[pixel * 4 + 3] === 255 ? 1 : 0);
    }
  }
});

test('the crib remains fixed-color while the infant skin, hair and swaddle can change', () => {
  const layers = familySpriteLayers.newborn.layers;
  assert(layers.some((layer) => 'color' in layer && layer.color === '#a17b5c'));
  for (const slot of ['skin', 'hair', 'shirt', 'shirtLight']) {
    assert(layers.some((layer) => 'slot' in layer && layer.slot === slot));
  }
});
