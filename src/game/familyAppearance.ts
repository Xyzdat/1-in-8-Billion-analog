export type FamilyColorSlot = 'skin' | 'skinShade' | 'mouth' | 'eyes'
  | 'hair' | 'hairShade' | 'hairLight'
  | 'shirt' | 'shirtShade' | 'shirtLight'
  | 'trousers' | 'trouserShade';

export type FamilyAppearance = {
  id: string;
  skinId: SkinToneId;
  hairId: string;
  shirtId: string;
  trousersId: string;
  colors: Record<FamilyColorSlot, string>;
};

// Keep the v1 palette order and IDs stable: existing lives derive their appearance from it.
const skinTones = [
  { id: 'light', base: '#f0cbb0', shade: '#d2a289', mouth: '#b8887c' },
  { id: 'peach', base: '#e6b695', shade: '#c48d72', mouth: '#a7736c' },
  { id: 'warm', base: '#d2a17a', shade: '#b17b5d', mouth: '#a66f60' },
  { id: 'tan', base: '#bc8965', shade: '#98664c', mouth: '#925e53' },
  { id: 'brown', base: '#986a50', shade: '#754a3b', mouth: '#b17c67' },
  { id: 'deep', base: '#704c3e', shade: '#54382f', mouth: '#a06e5e' },
] as const;

export type SkinToneId = typeof skinTones[number]['id'];
export const skinToneIds: readonly SkinToneId[] = Object.freeze(skinTones.map((tone) => tone.id));

export function isSkinToneId(value: unknown): value is SkinToneId {
  return skinTones.some((tone) => tone.id === value);
}

const hairColors = [
  { id: 'black', base: '#332f35', shade: '#25232b', light: '#5b4d46' },
  { id: 'dark-brown', base: '#5d463d', shade: '#413439', light: '#896a4e' },
  { id: 'chestnut', base: '#8a6247', shade: '#60453b', light: '#b18b62' },
  { id: 'copper', base: '#b27d54', shade: '#805640', light: '#cfaa76' },
  { id: 'golden', base: '#c7ad76', shade: '#9b8158', light: '#e2cb97' },
  { id: 'ash', base: '#8b8174', shade: '#665f5e', light: '#b7ad96' },
] as const;

const shirtColors = [
  { id: 'rose', base: '#c38f85', shade: '#a77370' },
  { id: 'sage', base: '#8fa58b', shade: '#70886f' },
  { id: 'sky', base: '#87a7b5', shade: '#668493' },
  { id: 'navy', base: '#72899f', shade: '#566f88' },
  { id: 'ochre', base: '#c5aa78', shade: '#a38b60' },
  { id: 'lavender', base: '#ab96b6', shade: '#887795' },
  { id: 'teal', base: '#78a39d', shade: '#587f7a' },
  { id: 'cream', base: '#d7c8ac', shade: '#b2a58f' },
] as const;

const trouserColors = [
  { id: 'graphite', base: '#737c88', shade: '#545f6f' },
  { id: 'olive', base: '#88917e', shade: '#66725f' },
  { id: 'sand', base: '#baa98b', shade: '#97866f' },
  { id: 'denim', base: '#879eb1', shade: '#627c96' },
  { id: 'taupe', base: '#a79c91', shade: '#827b75' },
  { id: 'plum', base: '#9a8d9c', shade: '#746a7e' },
] as const;

function hash(value: string) {
  let result = 2166136261;
  for (const letter of value) {
    result = Math.imul(result ^ letter.codePointAt(0)!, 16777619);
  }
  result = Math.imul(result ^ (result >>> 16), 0x85ebca6b);
  result = Math.imul(result ^ (result >>> 13), 0xc2b2ae35);
  return (result ^ (result >>> 16)) >>> 0;
}

export function chooseFamilySkin(
  sessionId: string | undefined,
  personId: string,
  weights: readonly number[],
): SkinToneId {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let selected = hash(JSON.stringify(['family-skin-v2', sessionId ?? 'mock-family-v2', personId])) % total;
  for (let index = 0; index < skinToneIds.length; index += 1) {
    selected -= weights[index];
    if (selected < 0) return skinToneIds[index];
  }
  return 'warm';
}

export function withFamilySkin(appearance: FamilyAppearance, skinId: SkinToneId): FamilyAppearance {
  const skin = skinTones.find((tone) => tone.id === skinId)!;
  return {
    ...appearance,
    id: `v2:${skin.id}:${appearance.hairId}:${appearance.shirtId}:${appearance.trousersId}`,
    skinId: skin.id,
    colors: {
      ...appearance.colors,
      skin: skin.base,
      skinShade: skin.shade,
      mouth: skin.mouth,
    },
  };
}

function highlight(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const source = parseInt(color.slice(offset, offset + 2), 16);
    return Math.round(source * 0.55 + 239 * 0.45).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

export function getFamilyAppearance(sessionId: string | undefined, personId: string): FamilyAppearance {
  const seed = ['family-appearance-v1', sessionId ?? 'mock-family-v1', personId];
  const choose = <T,>(channel: string, choices: readonly T[]): T =>
    choices[hash(JSON.stringify([...seed, channel])) % choices.length];
  const skin = choose('skin', skinTones);
  const hair = choose('hair', hairColors);
  const shirt = choose('shirt', shirtColors);
  const trousers = choose('trousers', trouserColors);

  return {
    id: `v1:${skin.id}:${hair.id}:${shirt.id}:${trousers.id}`,
    skinId: skin.id,
    hairId: hair.id,
    shirtId: shirt.id,
    trousersId: trousers.id,
    colors: {
      skin: skin.base,
      skinShade: skin.shade,
      mouth: skin.mouth,
      eyes: '#44383d',
      hair: hair.base,
      hairShade: hair.shade,
      hairLight: hair.light,
      shirt: shirt.base,
      shirtShade: shirt.shade,
      shirtLight: highlight(shirt.base),
      trousers: trousers.base,
      trouserShade: trousers.shade,
    },
  };
}
