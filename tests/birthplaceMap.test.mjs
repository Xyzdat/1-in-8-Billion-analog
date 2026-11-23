import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryCoordinates, cityCoordinates } from '../src/data/birthplaceCoordinates.ts';
import { projectBirthCoordinates, resolveBirthplaceMarker } from '../src/map/birthplaceMap.ts';

test('birthplace marker uses the selected city instead of a fixed Japan position', () => {
  const kobe = resolveBirthplaceMarker({ countryCode: 'JP', country: 'Япония', city: 'Кобе' });
  const ottawa = resolveBirthplaceMarker({ countryCode: 'CA', country: 'Канада', city: 'Оттава' });
  const paris = resolveBirthplaceMarker({ countryCode: 'FR', country: 'Франция', city: 'Париж' });
  assert.equal(kobe.precision, 'city');
  assert.equal(ottawa.precision, 'city');
  assert.equal(paris.precision, 'city');
  assert.ok(kobe.left > 75 && kobe.left < 90);
  assert.ok(ottawa.left > 15 && ottawa.left < 40);
  assert.ok(paris.left > 40 && paris.left < 55);
  assert.ok(ottawa.left < paris.left && paris.left < kobe.left);
  assert.match(kobe.label, /Кобе, Япония/);
  assert.notEqual(kobe.left, ottawa.left);
});

test('empty and unknown cities use an explicitly approximate country marker', () => {
  const birthplace = { countryCode: 'TZ', country: 'Танзания' };
  const rural = resolveBirthplaceMarker({ ...birthplace, city: '' });
  assert.equal(rural.precision, 'country');
  assert.ok(rural.left > 45 && rural.left < 65);
  assert.ok(rural.top > 55 && rural.top < 80);
  assert.match(rural.label, /Танзания.*приблизительное/);
  assert.deepEqual(resolveBirthplaceMarker(birthplace), rural);
  assert.deepEqual(resolveBirthplaceMarker({ ...birthplace, city: null }), rural);
  assert.deepEqual(resolveBirthplaceMarker({ ...birthplace, city: 'Несуществующий город' }), rural);
  assert.deepEqual(resolveBirthplaceMarker({ ...birthplace, city: 'Кобе' }), rural);
});

test('country codes and city aliases are normalized without mixing countries', () => {
  const expected = resolveBirthplaceMarker({ countryCode: 'JP', country: 'Япония', city: 'Кобе' });
  for (const city of ['КОБЕ', ' Кобе. ', 'Kobe', 'Kōbe']) {
    const actual = resolveBirthplaceMarker({ countryCode: ' jp ', country: 'Япония', city });
    assert.equal(actual.precision, 'city', city);
    assert.equal(actual.left, expected.left, city);
    assert.equal(actual.top, expected.top, city);
  }
  assert.equal(resolveBirthplaceMarker({ countryCode: 'FR', country: 'Франция', city: 'Кобе' }).precision, 'country');
});

test('unknown countries never silently point to Japan or another existing place', () => {
  for (const countryCode of ['', 'ZZ', 'JPN', '../JP']) {
    assert.equal(resolveBirthplaceMarker({ countryCode, country: 'Неизвестная страна', city: 'Кобе' }), null);
  }
});

test('projection accepts zero, rejects invalid coordinates and identifies cropped edges', () => {
  const equator = projectBirthCoordinates(0, 0);
  assert.ok(equator.left > 0 && equator.top > 0);
  assert.equal(equator.atEdge, false);
  for (const coordinates of [[NaN, 0], [0, Infinity], [91, 0], [0, -181]]) {
    assert.equal(projectBirthCoordinates(...coordinates), null);
  }
  assert.equal(projectBirthCoordinates(90, -180).atEdge, true);
  assert.match(resolveBirthplaceMarker({ countryCode: 'AQ', country: 'Антарктида' }).label, /краю карты/);
});

test('all reference points stay visible inside the responsive map', () => {
  assert.ok(Object.keys(countryCoordinates).length >= 240);
  for (const [latitude, longitude] of [...Object.values(countryCoordinates), ...Object.values(cityCoordinates)]) {
    const point = projectBirthCoordinates(latitude, longitude);
    assert.ok(point);
    assert.ok(point.left >= 3 && point.left <= 97);
    assert.ok(point.top >= 5 && point.top <= 95);
    for (const width of [280, 373]) {
      const height = width * 176.927 / 373;
      const radius = 12.7024 / 2;
      assert.ok(point.left / 100 * width >= radius);
      assert.ok(point.left / 100 * width <= width - radius);
      assert.ok(point.top / 100 * height >= radius);
      assert.ok(point.top / 100 * height <= height - radius);
    }
  }
});
