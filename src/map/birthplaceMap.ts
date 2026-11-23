import { cityCoordinates, countryCoordinates } from '../data/birthplaceCoordinates.ts';

export type BirthplaceMapLocation = {
  countryCode: string;
  country: string;
  city?: string | null;
};

export type BirthplaceMarker = {
  left: number;
  top: number;
  label: string;
  precision: 'city' | 'country';
  atEdge: boolean;
};

function normalizeCity(value: string) {
  return value.normalize('NFKC').trim().toLowerCase()
    .replace(/\p{Script=Latin}/gu, (letter) => letter.normalize('NFD').replace(/\p{M}/gu, ''))
    .replaceAll('ё', 'е')
    .replace(/[\s\p{P}]+/gu, ' ')
    .trim();
}

export function projectBirthCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  // Approximate equirectangular registration of setup-world-map.png (1774 × 887).
  // Include the existing Figma crop: x -10.3%, y -11.03%, scale 116.4% × 122.38%.
  const imageX = 826 + longitude * 4.27;
  const imageY = 541 - latitude * 4.9;
  const left = (-0.103 + 1.164 * imageX / 1774) * 100;
  const top = (-0.1103 + 1.2238 * imageY / 887) * 100;
  // The decorative bitmap omits some remote islands. Keep their marker visible
  // at the nearest edge and explicitly describe that in the tooltip.
  const boundedLeft = Math.max(3, Math.min(97, left));
  const boundedTop = Math.max(5, Math.min(95, top));

  return {
    left: boundedLeft,
    top: boundedTop,
    atEdge: boundedLeft !== left || boundedTop !== top,
  };
}

export function resolveBirthplaceMarker(location: BirthplaceMapLocation): BirthplaceMarker | null {
  const code = location.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return null;
  }
  const city = location.city?.trim();
  const cityPoint = city ? cityCoordinates[`${code}:${normalizeCity(city)}`] : undefined;
  const point = cityPoint ?? countryCoordinates[code];
  if (!point) {
    return null;
  }
  const position = projectBirthCoordinates(point[0], point[1]);
  if (!position) {
    return null;
  }
  const precision = cityPoint ? 'city' : 'country';
  const label = cityPoint
    ? `Место рождения: ${city}, ${location.country}`
    : `Страна рождения: ${location.country} (приблизительное положение)`;

  return {
    ...position,
    precision,
    label: position.atEdge ? `${label}. Положение на краю карты` : label,
  };
}
