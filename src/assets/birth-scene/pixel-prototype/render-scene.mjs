import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { getFamilyAppearance } from '../../../game/familyAppearance.ts';

// Each rectangle is placed on an integer pixel grid. No image generation is used.
const WIDTH = 256;
const HEIGHT = 144;

function canvas(width, height) {
  const pixels = Buffer.alloc(width * height * 4);

  return {
    width,
    height,
    pixels,
    rect(x, y, w, h, color) {
      const hex = color.replace('#', '');
      const rgba = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

      for (let py = Math.max(0, y); py < Math.min(height, y + h); py += 1) {
        for (let px = Math.max(0, x); px < Math.min(width, x + w); px += 1) {
          const index = (py * width + px) * 4;
          pixels.set([...rgba, 255], index);
        }
      }
    },
    paste(source, x, y) {
      for (let py = 0; py < source.height; py += 1) {
        for (let px = 0; px < source.width; px += 1) {
          const from = (py * source.width + px) * 4;
          const tx = x + px;
          const ty = y + py;

          if (source.pixels[from + 3] && tx >= 0 && tx < width && ty >= 0 && ty < height) {
            pixels.set(source.pixels.subarray(from, from + 4), (ty * width + tx) * 4);
          }
        }
      }
    },
  };
}

// Scanline polygons fill whole pixels without antialiasing.
function shape(image, points, color) {
  const top = Math.min(...points.map((point) => point[1]));
  const bottom = Math.max(...points.map((point) => point[1]));

  for (let y = top; y < bottom; y += 1) {
    const intersections = [];

    for (let index = 0; index < points.length; index += 1) {
      const [x1, y1] = points[index];
      const [x2, y2] = points[(index + 1) % points.length];
      const scanY = y + 0.5;

      if ((y1 <= scanY && y2 > scanY) || (y2 <= scanY && y1 > scanY)) {
        intersections.push(x1 + ((scanY - y1) * (x2 - x1)) / (y2 - y1));
      }
    }

    intersections.sort((a, b) => a - b);

    for (let index = 0; index < intersections.length; index += 2) {
      const start = Math.ceil(intersections[index] - 0.5);
      const end = Math.ceil(intersections[index + 1] - 0.5);
      image.rect(start, y, end - start, 1, color);
    }
  }
}

function adult({
  skin,
  shade,
  hair,
  hairShade,
  hairLight,
  shirt,
  shirtShade,
  trousers,
  trouserShade,
  longHair,
  hairStyle = longHair ? 'waves' : 'short',
  beard = false,
}) {
  const image = canvas(28, 56);
  const r = image.rect;
  const p = (points, color) => shape(image, points, color);

  // Broad hair shapes with just one light accent.
  if (hairStyle === 'bun') {
    p([[9, 3], [18, 3], [22, 7], [23, 13], [20, 19], [8, 18],
      [5, 13], [6, 7]], hairShade);
    p([[10, 4], [18, 4], [21, 8], [21, 15], [17, 18], [8, 16],
      [7, 11]], hair);
    r(7, 0, 8, 5, hairShade);
    r(8, 1, 6, 3, hair);
    r(9, 1, 3, 1, hairLight);
  } else if (hairStyle === 'curls') {
    p([[7, 7], [7, 4], [11, 4], [11, 2], [16, 2], [16, 3],
      [20, 3], [20, 5], [23, 5], [24, 10], [22, 16], [8, 16],
      [5, 12], [5, 8]], hairShade);
    p([[9, 6], [12, 4], [16, 4], [19, 5], [21, 7], [22, 11],
      [20, 14], [8, 14], [7, 10]], hair);
  } else if (longHair) {
    p([[9, 2], [18, 2], [22, 6], [23, 13], [21, 18], [22, 23],
      [18, 26], [7, 25], [4, 21], [6, 16], [5, 9], [7, 4]], hairShade);
    p([[9, 3], [18, 3], [21, 7], [21, 16], [19, 20], [20, 24],
      [8, 24], [6, 20], [8, 15], [6, 10], [8, 5]], hair);
  } else {
    p([[10, 3], [17, 2], [22, 5], [23, 10], [21, 16], [8, 16],
      [6, 11], [7, 6]], hairShade);
    p([[10, 4], [17, 3], [21, 6], [21, 13], [9, 14], [8, 8]], hair);
  }

  // Small eyes and a short smile keep the face readable without portrait detail.
  r(13, 18, 6, 7, shade);
  r(15, 19, 4, 6, skin);
  p([[11, 6], [19, 6], [22, 9], [22, 13], [24, 14], [22, 16],
    [21, 19], [18, 21], [13, 19], [10, 15], [10, 9]], shade);
  p([[12, 7], [19, 7], [21, 10], [21, 14], [23, 14], [21, 16],
    [20, 18], [17, 20], [13, 18], [11, 14], [11, 10]], skin);
  r(10, 12, 2, 4, skin);
  r(16, 12, 1, 2, '#55454a');
  r(21, 12, 1, 1, '#55454a');
  r(21, 15, 1, 1, shade);
  r(19, 18, 2, 1, '#a7736c');

  if (hairStyle === 'bun') {
    p([[8, 6], [14, 4], [19, 6], [21, 9], [16, 8], [12, 11],
      [10, 15], [8, 16], [7, 11]], hair);
    r(10, 6, 4, 1, hairLight);
  } else if (hairStyle === 'curls') {
    p([[8, 7], [12, 5], [18, 5], [22, 8], [20, 10], [17, 9],
      [14, 11], [10, 10], [10, 14], [8, 14]], hair);
    r(11, 6, 2, 1, hairLight);
    r(17, 6, 2, 1, hairLight);
  } else if (longHair) {
    p([[9, 5], [18, 4], [21, 7], [16, 8], [12, 11], [11, 18],
      [9, 20], [8, 14], [7, 10]], hair);
    r(10, 6, 4, 1, hairLight);
    r(8, 11, 1, 4, hairLight);
  } else {
    p([[9, 5], [16, 4], [21, 6], [22, 9], [17, 8], [13, 10],
      [10, 10], [10, 14], [8, 14]], hair);
    r(10, 5, 5, 1, hairLight);
  }

  if (beard) {
    p([[13, 17], [16, 18], [19, 18], [22, 17], [21, 20], [18, 22],
      [14, 20]], hair);
    r(18, 19, 2, 1, '#b88a72');
  }

  // Two-tone trousers and simple shoes.
  p([[9, 37], [22, 37], [22, 44], [21, 53], [16, 53], [15, 44],
    [13, 53], [8, 53]], trouserShade);
  p([[10, 38], [21, 38], [21, 43], [20, 52], [17, 52], [16, 42],
    [12, 42], [12, 52], [9, 52]], trousers);
  r(7, 52, 7, 3, '#65544f');
  r(17, 52, 7, 3, '#65544f');
  r(8, 54, 5, 1, '#b7a18a');
  r(18, 54, 5, 1, '#b7a18a');

  // Cardigan silhouette, pale shirt and two buttons; no fine seams or pockets.
  p([[10, 23], [13, 22], [19, 22], [23, 25], [25, 31], [23, 38],
    [21, 40], [8, 40], [5, 36], [4, 30], [6, 25]], shirtShade);
  p([[10, 24], [13, 23], [18, 23], [22, 26], [22, 38], [9, 38],
    [6, 34], [6, 29], [8, 26]], shirt);
  p([[13, 24], [18, 24], [17, 29], [17, 36], [14, 36], [14, 29]], '#eee0c8');
  r(10, 27, 1, 10, shirtShade);
  r(19, 28, 1, 9, shirtShade);
  r(18, 30, 1, 1, '#e5ccb1');
  r(18, 35, 1, 1, '#e5ccb1');

  if (longHair) {
    p([[6, 27], [8, 27], [8, 34], [12, 37], [10, 39], [6, 36],
      [5, 31]], shirt);
    p([[22, 27], [24, 29], [24, 34], [20, 38], [18, 36], [21, 32]], shirt);
    r(11, 37, 4, 2, skin);
    r(15, 36, 4, 2, skin);
    r(14, 38, 3, 1, shade);
  } else {
    p([[6, 27], [8, 27], [7, 36], [5, 38], [4, 35], [4, 30]], shirt);
    p([[22, 27], [24, 28], [25, 34], [23, 38], [21, 36]], shirt);
    r(5, 37, 2, 4, skin);
    r(22, 37, 2, 4, skin);
  }

  return image;
}

function child({
  age,
  skin,
  shade,
  hair,
  hairShade,
  hairLight,
  shirt,
  shirtShade,
  trousers,
  trouserShade,
  hairStyle,
  outfit = 'sweater',
}) {
  const layouts = {
    3: {
      width: 18,
      height: 30,
      headX: 4,
      headY: 3,
      headWidth: 9,
      headHeight: 10,
      bodyTop: 14,
      bodyBottom: 22,
      bodyWidth: 8,
    },
    6: {
      width: 20,
      height: 38,
      headX: 5,
      headY: 4,
      headWidth: 10,
      headHeight: 10,
      bodyTop: 16,
      bodyBottom: 27,
      bodyWidth: 10,
    },
    10: {
      width: 24,
      height: 46,
      headX: 7,
      headY: 4,
      headWidth: 10,
      headHeight: 12,
      bodyTop: 18,
      bodyBottom: 32,
      bodyWidth: 11,
    },
  };
  const layout = layouts[age];

  if (!layout) {
    throw new RangeError('Child sprite age must be 3, 6 or 10.');
  }

  const {
    width,
    height,
    headX: hx,
    headY: hy,
    headWidth: hw,
    headHeight: hh,
    bodyTop,
    bodyBottom,
    bodyWidth,
  } = layout;
  const image = canvas(width, height);
  const r = image.rect;
  const p = (points, color) => shape(image, points, color);
  const left = Math.floor((width - bodyWidth) / 2);
  const right = left + bodyWidth;
  const middle = Math.floor(width / 2);
  const shoesY = height - 3;

  // Children get their own age proportions, rather than scaled adult figures.
  if (hairStyle === 'bob' || hairStyle === 'pigtails' || hairStyle === 'ponytail') {
    p([[hx + 1, hy - 2], [hx + hw - 2, hy - 2], [hx + hw + 1, hy + 1],
      [hx + hw, hy + hh], [hx + 2, hy + hh + 2], [hx - 2, hy + hh - 1],
      [hx - 2, hy + 1]], hairShade);
    r(hx - 1, hy + 2, 3, hh - 1, hair);

    if (hairStyle === 'pigtails') {
      r(hx - 3, hy + 5, 3, 8, hair);
      r(hx + hw, hy + 5, 3, 8, hair);
      r(hx - 2, hy + 5, 2, 1, shirt);
      r(hx + hw, hy + 5, 2, 1, shirt);
    }

    if (hairStyle === 'ponytail') {
      p([[hx - 2, hy + 3], [hx, hy + 4], [hx - 1, hy + 12],
        [hx - 4, hy + 15], [hx - 3, hy + 8]], hair);
      r(hx - 2, hy + 4, 2, 1, shirt);
    }
  } else if (hairStyle === 'curls') {
    p([[hx - 1, hy], [hx - 1, hy - 2], [hx + 3, hy - 2], [hx + 3, hy - 3],
      [hx + 7, hy - 3], [hx + 7, hy - 1], [hx + hw, hy - 1],
      [hx + hw + 1, hy + 3], [hx + hw, hy + 7], [hx - 1, hy + 7],
      [hx - 3, hy + 3]], hairShade);
  } else {
    p([[hx + 1, hy - 2], [hx + hw - 2, hy - 2], [hx + hw + 1, hy + 2],
      [hx + hw, hy + 7], [hx, hy + 7], [hx - 1, hy + 2]], hairShade);
  }

  r(middle, hy + hh - 1, 3, bodyTop - hy - hh + 3, shade);
  p([[hx + 2, hy], [hx + hw - 2, hy], [hx + hw, hy + 2],
    [hx + hw, hy + hh - 4], [hx + hw + 1, hy + hh - 3],
    [hx + hw - 1, hy + hh - 2], [hx + hw - 2, hy + hh],
    [hx + 3, hy + hh], [hx + 1, hy + hh - 2], [hx, hy + 3]], shade);
  p([[hx + 2, hy + 1], [hx + hw - 2, hy + 1], [hx + hw - 1, hy + 3],
    [hx + hw - 1, hy + hh - 3], [hx + hw - 3, hy + hh - 1],
    [hx + 3, hy + hh - 1], [hx + 1, hy + hh - 3], [hx + 1, hy + 3]], skin);
  r(hx, hy + 5, 2, 3, skin);
  r(hx + hw - 5, hy + 5, 1, age === 10 ? 2 : 1, '#55454a');
  r(hx + hw - 1, hy + 5, 1, 1, '#55454a');
  r(hx + hw - 3, hy + hh - 2, 1, 1, '#a7736c');

  p([[hx + 1, hy - 1], [hx + hw - 2, hy - 1], [hx + hw, hy + 2],
    [hx + hw - 3, hy + 2], [hx + 3, hy + 4], [hx + 1, hy + 7],
    [hx - 1, hy + 6], [hx - 1, hy + 2]], hair);
  r(hx + 2, hy, 3, 1, hairLight);

  if (hairStyle === 'curls') {
    r(hx + 1, hy - 2, 3, 2, hair);
    r(hx + 5, hy - 2, 3, 2, hair);
  }

  // Two simple trouser legs and small shoes.
  r(left + 1, bodyBottom - 1, Math.floor(bodyWidth / 2) - 1, shoesY - bodyBottom + 2, trouserShade);
  r(middle + 1, bodyBottom - 1, Math.floor(bodyWidth / 2) - 1, shoesY - bodyBottom + 2, trouserShade);
  r(left + 2, bodyBottom, Math.floor(bodyWidth / 2) - 2, shoesY - bodyBottom, trousers);
  r(middle + 2, bodyBottom, Math.floor(bodyWidth / 2) - 2, shoesY - bodyBottom, trousers);
  r(left, shoesY, Math.floor(bodyWidth / 2), 2, '#756455');
  r(middle + 1, shoesY, Math.floor(bodyWidth / 2), 2, '#756455');
  r(left + 1, shoesY + 1, Math.floor(bodyWidth / 2) - 1, 1, '#cbb89a');
  r(middle + 2, shoesY + 1, Math.floor(bodyWidth / 2) - 1, 1, '#cbb89a');

  p([[left + 1, bodyTop], [right - 1, bodyTop], [right + 2, bodyTop + 3],
    [right + 2, bodyBottom - 2], [right, bodyBottom + 1],
    [left, bodyBottom + 1], [left - 2, bodyBottom - 2], [left - 2, bodyTop + 3]], shirtShade);
  p([[left + 1, bodyTop + 1], [right - 1, bodyTop + 1], [right, bodyTop + 3],
    [right, bodyBottom], [left, bodyBottom], [left, bodyTop + 3]], shirt);
  r(left - 2, bodyBottom - 2, 2, 3, skin);
  r(right, bodyBottom - 2, 2, 3, skin);
  r(middle, bodyTop + 1, 2, 1, '#eee0c8');

  if (outfit === 'overalls') {
    r(left + 2, bodyTop + 2, 1, bodyBottom - bodyTop - 1, trousers);
    r(right - 3, bodyTop + 2, 1, bodyBottom - bodyTop - 1, trousers);
    r(left + 2, bodyTop + 5, bodyWidth - 4, bodyBottom - bodyTop - 4, trousers);
  } else if (outfit === 'cardigan' || outfit === 'overshirt') {
    r(middle, bodyTop + 2, 2, bodyBottom - bodyTop - 3, '#eee0c8');
    r(middle + 2, bodyTop + 5, 1, 1, '#dec7a7');
  } else if (outfit === 'tunic') {
    r(left - 1, bodyBottom - 1, bodyWidth + 2, 2, shirt);
    r(middle + 1, bodyTop + 4, 1, 1, '#eee0c8');
  }

  return image;
}

function newborn() {
  const image = canvas(38, 30);
  const r = image.rect;
  const p = (points, color) => shape(image, points, color);

  r(6, 24, 3, 6, '#a17b5c');
  r(29, 24, 3, 6, '#a17b5c');
  p([[4, 10], [9, 8], [30, 8], [36, 11], [36, 18], [33, 24],
    [29, 26], [8, 26], [4, 23], [1, 17], [1, 13]], '#a17b5c');
  p([[5, 11], [10, 9], [29, 9], [35, 12], [34, 18], [31, 23],
    [8, 24], [5, 21], [2, 16], [2, 13]], '#dabb90');
  p([[7, 12], [29, 11], [32, 14], [30, 20], [7, 20], [4, 16]], '#f5e5c4');

  // One fold in the blanket and a small sleeping face.
  p([[16, 12], [25, 10], [31, 14], [32, 18], [28, 21], [14, 21],
    [12, 17]], '#91ac92');
  p([[17, 13], [24, 12], [29, 15], [30, 18], [26, 20], [15, 20]],
    '#bacba6');
  p([[15, 13], [20, 14], [24, 19], [20, 20], [13, 16]], '#e2e4bf');
  p([[10, 5], [17, 4], [21, 7], [21, 12], [18, 15], [12, 15],
    [9, 12], [8, 8]], '#c68f72');
  p([[11, 5], [17, 5], [20, 8], [20, 11], [17, 14], [12, 14],
    [9, 11], [9, 8]], '#eab994');
  r(12, 4, 4, 1, '#8f6953');
  r(11, 10, 2, 1, '#8a635a');
  r(17, 9, 2, 1, '#8a635a');
  r(16, 12, 1, 1, '#b47c70');
  r(21, 14, 3, 2, '#eab994');

  r(4, 20, 30, 2, '#efd3a6');
  r(7, 22, 24, 2, '#c6a074');
  for (let x = 8; x <= 28; x += 6) {
    r(x, 22, 2, 2, '#efd3a6');
  }

  return image;
}

function mirror(image) {
  const result = canvas(image.width, image.height);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const from = (y * image.width + x) * 4;
      const to = (y * image.width + image.width - x - 1) * 4;
      result.pixels.set(image.pixels.subarray(from, from + 4), to);
    }
  }

  return result;
}

function enlarge(image, scale) {
  const result = canvas(image.width * scale, image.height * scale);

  for (let y = 0; y < result.height; y += 1) {
    for (let x = 0; x < result.width; x += 1) {
      const from = (Math.floor(y / scale) * image.width + Math.floor(x / scale)) * 4;
      result.pixels.set(image.pixels.subarray(from, from + 4), (y * result.width + x) * 4);
    }
  }

  return result;
}

function room() {
  const image = canvas(WIDTH, HEIGHT);
  const r = image.rect;

  r(0, 0, 256, 96, '#e8d5ba');
  r(0, 0, 256, 5, '#c8b397');
  r(0, 5, 256, 2, '#f5e7cc');
  r(0, 95, 256, 49, '#bc9374');
  r(0, 94, 256, 4, '#a47d64');

  for (let y = 103; y < 144; y += 10) {
    r(0, y, 256, 1, '#a7816a');
    r((y % 3) * 28, y - 5, 1, 5, '#a7816a');
    r(140 + (y % 4) * 12, y - 5, 1, 5, '#a7816a');
  }

  // Window: only trees and sky, without recognisable city landmarks.
  r(15, 16, 69, 58, '#ae8b70');
  r(18, 19, 63, 50, '#accacb');
  r(20, 21, 59, 47, '#c3dfe0');
  r(22, 46, 18, 22, '#96b4a0');
  r(29, 39, 12, 29, '#96b4a0');
  r(57, 44, 20, 24, '#a5b99a');
  r(62, 36, 11, 32, '#a5b99a');
  r(20, 60, 59, 8, '#b7c6a0');
  r(48, 19, 3, 50, '#f9eacc');
  r(18, 43, 63, 3, '#f9eacc');
  r(12, 72, 75, 4, '#f8e9cf');
  r(11, 13, 7, 57, '#d5aa93');
  r(81, 13, 7, 57, '#d5aa93');
  r(13, 16, 2, 51, '#ecc3a5');
  r(84, 16, 2, 51, '#b98e7c');

  // Sofa and small framed picture.
  r(91, 76, 79, 28, '#bbaa96');
  r(95, 72, 71, 23, '#d4c3a8');
  r(98, 75, 65, 16, '#e2d2b6');
  r(94, 94, 73, 8, '#c8b69c');
  r(89, 83, 7, 20, '#c4b094');
  r(165, 83, 7, 20, '#c4b094');
  r(97, 104, 4, 4, '#856a59');
  r(161, 104, 4, 4, '#856a59');
  r(100, 80, 14, 12, '#8ba9aa');
  r(146, 80, 13, 12, '#cda491');
  r(112, 25, 42, 30, '#af8c6a');
  r(115, 28, 36, 24, '#f7ebd2');
  r(119, 32, 28, 11, '#c7d5cd');
  r(119, 43, 28, 5, '#adbd9b');
  r(123, 40, 13, 3, '#adbd9b');

  // Bookcase, books and a plant.
  r(201, 60, 39, 45, '#aa8164');
  r(204, 63, 33, 18, '#886d59');
  r(204, 84, 33, 17, '#886d59');
  for (let x = 207; x < 234; x += 5) {
    const colors = ['#8da8a9', '#c7b591', '#bd8f7e'];
    r(x, 65 + x % 3, 3, 13 - x % 3, colors[x % 3]);
  }
  r(209, 88, 24, 11, '#c8b394');
  r(214, 91, 13, 2, '#a78e72');
  r(214, 50, 14, 10, '#d1b295');
  r(219, 31, 2, 20, '#74886a');
  r(211, 36, 8, 4, '#829a72');
  r(221, 29, 8, 4, '#829a72');
  r(222, 41, 10, 4, '#829a72');
  r(213, 45, 7, 4, '#829a72');

  // Stepped edges keep even the rug on the pixel grid.
  r(52, 112, 151, 16, '#cdb296');
  r(61, 108, 133, 24, '#cdb296');
  r(73, 105, 109, 30, '#cdb296');
  r(62, 113, 131, 13, '#dfc8a7');
  r(76, 110, 103, 20, '#dfc8a7');

  return image;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return result;
}

function save(image, filename) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = [];

  for (let y = 0; y < image.height; y += 1) {
    rows.push(Buffer.from([0]));
    rows.push(image.pixels.subarray(y * image.width * 4, (y + 1) * image.width * 4));
  }

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(fileURLToPath(new URL(filename, import.meta.url)), png);
}

const motherPalette = {
  skin: '#e2af8c',
  shade: '#c58d75',
  hair: '#765548',
  hairShade: '#513e3d',
  hairLight: '#b28662',
  shirt: '#c38f85',
  shirtShade: '#a77370',
  trousers: '#7f8d7d',
  trouserShade: '#626e66',
  longHair: true,
};
const mother = adult(motherPalette);
const fatherPalette = {
  skin: '#c99978',
  shade: '#ac7c64',
  hair: '#51463f',
  hairShade: '#38353b',
  hairLight: '#82705b',
  shirt: '#829da7',
  shirtShade: '#657f8d',
  trousers: '#686879',
  trouserShade: '#4e5266',
  longHair: false,
};
const father = mirror(adult(fatherPalette));
const baby = newborn();
const background = room();
const scene = room();
scene.paste(mother, 69, 61);
scene.paste(father, 162, 61);
scene.paste(baby, 109, 93);

save(background, 'background.png');
save(mother, 'mother.png');
save(father, 'father.png');
save(baby, 'newborn.png');
save(scene, 'scene.png');
save(enlarge(scene, 4), 'scene@4x.png');

const woman02Palette = {
  skin: '#bd8d6b',
  shade: '#9b6e57',
  hair: '#473d40',
  hairShade: '#332f38',
  hairLight: '#756153',
  shirt: '#82a6a0',
  shirtShade: '#62857f',
  trousers: '#a99d88',
  trouserShade: '#887f73',
  longHair: true,
  hairStyle: 'bun',
};
const woman02 = mirror(adult(woman02Palette));
const man02Palette = {
  skin: '#bd8b67',
  shade: '#996748',
  hair: '#4a3c36',
  hairShade: '#342e31',
  hairLight: '#76604a',
  shirt: '#c5ae88',
  shirtShade: '#a38b6d',
  trousers: '#7d856f',
  trouserShade: '#5f665a',
  longHair: false,
  hairStyle: 'curls',
  beard: true,
};
const man02 = adult(man02Palette);
const children = [
  {
    id: 'girl-age-03',
    label: 'Девочка · около 3 лет',
    sex: 'FEMALE',
    direction: 'RIGHT',
    palette: {
      age: 3,
      skin: '#d3a17e',
      shade: '#b78065',
      hair: '#6d5145',
      hairShade: '#4e3e3b',
      hairLight: '#9a7658',
      shirt: '#d5a28a',
      shirtShade: '#b98374',
      trousers: '#ded1b3',
      trouserShade: '#b8aa92',
      hairStyle: 'bob',
      outfit: 'tunic',
    },
  },
  {
    id: 'boy-age-03',
    label: 'Мальчик · около 3 лет',
    sex: 'MALE',
    direction: 'LEFT',
    palette: {
      age: 3,
      skin: '#e1b28e',
      shade: '#c48f72',
      hair: '#8a664e',
      hairShade: '#654c41',
      hairLight: '#b18d68',
      shirt: '#98b6bf',
      shirtShade: '#7997a3',
      trousers: '#b8a68d',
      trouserShade: '#968574',
      hairStyle: 'fringe',
    },
  },
  {
    id: 'girl-age-06',
    label: 'Девочка · около 6 лет',
    sex: 'FEMALE',
    direction: 'LEFT',
    palette: {
      age: 6,
      skin: '#deb08c',
      shade: '#bc886d',
      hair: '#775541',
      hairShade: '#543f37',
      hairLight: '#a68159',
      shirt: '#a0b49a',
      shirtShade: '#7e947a',
      trousers: '#8a9fb1',
      trouserShade: '#6a7f94',
      hairStyle: 'pigtails',
      outfit: 'overalls',
    },
  },
  {
    id: 'boy-age-06',
    label: 'Мальчик · около 6 лет',
    sex: 'MALE',
    direction: 'RIGHT',
    palette: {
      age: 6,
      skin: '#b98967',
      shade: '#97654f',
      hair: '#493b35',
      hairShade: '#302d32',
      hairLight: '#74604c',
      shirt: '#bc8d79',
      shirtShade: '#9e6f63',
      trousers: '#7b8592',
      trouserShade: '#5d6776',
      hairStyle: 'curls',
    },
  },
  {
    id: 'girl-age-10',
    label: 'Девочка · около 10 лет',
    sex: 'FEMALE',
    direction: 'RIGHT',
    palette: {
      age: 10,
      skin: '#d6a27e',
      shade: '#b88368',
      hair: '#6d4e40',
      hairShade: '#4c3b36',
      hairLight: '#9b7555',
      shirt: '#b0a0bd',
      shirtShade: '#90809e',
      trousers: '#baa88b',
      trouserShade: '#97866f',
      hairStyle: 'ponytail',
      outfit: 'cardigan',
    },
  },
  {
    id: 'boy-age-10',
    label: 'Мальчик · около 10 лет',
    sex: 'MALE',
    direction: 'LEFT',
    palette: {
      age: 10,
      skin: '#cda17d',
      shade: '#ad7b61',
      hair: '#6b5143',
      hairShade: '#4c3c37',
      hairLight: '#947354',
      shirt: '#97aa96',
      shirtShade: '#788e7c',
      trousers: '#737b87',
      trouserShade: '#565f6d',
      hairStyle: 'side-part',
      outfit: 'overshirt',
    },
  },
];
const sprites = [
  {
    id: 'adult-woman-01',
    file: 'mother.png',
    label: 'Женщина · вариант 1',
    kind: 'adult',
    sex: 'FEMALE',
    direction: 'RIGHT',
    image: mother,
  },
  {
    id: 'adult-woman-02',
    file: 'adult-woman-02.png',
    label: 'Женщина · вариант 2',
    kind: 'adult',
    sex: 'FEMALE',
    direction: 'LEFT',
    image: woman02,
  },
  {
    id: 'adult-man-01',
    file: 'father.png',
    label: 'Мужчина · вариант 1',
    kind: 'adult',
    sex: 'MALE',
    direction: 'LEFT',
    image: father,
  },
  {
    id: 'adult-man-02',
    file: 'adult-man-02.png',
    label: 'Мужчина · вариант 2',
    kind: 'adult',
    sex: 'MALE',
    direction: 'RIGHT',
    image: man02,
  },
  {
    id: 'newborn',
    file: 'newborn.png',
    label: 'Младенец в люльке',
    kind: 'newborn',
    direction: 'NONE',
    image: baby,
  },
  ...children.map(({ id, label, sex, direction, palette }) => ({
    id,
    file: id + '.png',
    label,
    kind: 'sibling',
    approximateAge: palette.age,
    sex,
    direction,
    image: direction === 'LEFT' ? mirror(child(palette)) : child(palette),
  })),
];

for (const sprite of sprites) {
  save(sprite.image, sprite.file);
}

function familyScene(parentIds, siblingIds) {
  if (parentIds.length > 2 || siblingIds.length > 6) {
    throw new RangeError('This prototype supports up to two parents and six older siblings.');
  }

  const result = room();
  const lookup = (id) => {
    const sprite = sprites.find((entry) => entry.id === id);

    if (!sprite) {
      throw new Error('Unknown sprite: ' + id);
    }

    return sprite;
  };
  const place = (sprite, center, floor) => {
    const facing = center > WIDTH / 2 ? 'LEFT' : 'RIGHT';
    const image = sprite.direction !== facing && sprite.direction !== 'NONE'
      ? mirror(sprite.image)
      : sprite.image;
    result.paste(image, Math.round(center - image.width / 2), floor - image.height);
  };

  parentIds.forEach((id, index) => {
    const sprite = lookup(id);

    if (sprite.kind !== 'adult') {
      throw new Error('Parent slot requires an adult sprite.');
    }

    const center = parentIds.length === 1 ? 66 : index === 0 ? 40 : 216;
    place(sprite, center, 117);
  });
  siblingIds.forEach((id, index) => {
    const sprite = lookup(id);

    if (sprite.kind !== 'sibling') {
      throw new Error('Sibling slot requires a child sprite.');
    }

    const left = parentIds.length === 1 ? 125 : 77;
    const right = 178;
    const center = parentIds.length === 2 && siblingIds.length === 3
      ? [77, 144, 178][index]
      : siblingIds.length === 1
        ? (left + right) / 2
        : left + ((right - left) * index) / (siblingIds.length - 1);
    place(sprite, center, 117);
  });
  result.paste(baby, 109, 93);
  return result;
}

const examples = [
  {
    id: 'two-moms',
    label: 'Две мамы, три сестры и младенец',
    parents: ['adult-woman-01', 'adult-woman-02'],
    siblings: ['girl-age-10', 'girl-age-03', 'girl-age-06'],
  },
  {
    id: 'two-dads',
    label: 'Два папы, три брата и младенец',
    parents: ['adult-man-02', 'adult-man-01'],
    siblings: ['boy-age-10', 'boy-age-03', 'boy-age-06'],
  },
  {
    id: 'single-mom',
    label: 'Мама, брат, сестра и младенец',
    parents: ['adult-woman-02'],
    siblings: ['boy-age-06', 'girl-age-03'],
  },
];

for (const example of examples) {
  const image = familyScene(example.parents, example.siblings);
  save(enlarge(image, 4), 'family-' + example.id + '@4x.png');
}

const sheet = canvas(256, 144);

for (let y = 0; y < sheet.height; y += 8) {
  for (let x = 0; x < sheet.width; x += 8) {
    sheet.rect(x, y, 8, 8, (x / 8 + y / 8) % 2 ? '#e5e6e8' : '#f8f5ee');
  }
}

sprites.filter((sprite) => sprite.kind !== 'sibling').forEach((sprite, index) => {
  sheet.paste(sprite.image, 16 + index * 47, 63 - sprite.image.height);
});
sprites.filter((sprite) => sprite.kind === 'sibling').forEach((sprite, index) => {
  sheet.paste(sprite.image, 15 + index * 40, 132 - sprite.image.height);
});
save(enlarge(sheet, 4), 'family-sheet@4x.png');

const manifest = {
  version: 1,
  style: 'pixel-medium-detail',
  stage: 'birth',
  integratedIntoGame: true,
  sceneSize: { width: WIDTH, height: HEIGHT },
  background: 'background.png',
  sprites: sprites.map(({ image, ...metadata }) => ({
    ...metadata,
    width: image.width,
    height: image.height,
    transparent: true,
    canMirror: metadata.direction !== 'NONE',
    anchor: { x: 0.5, y: 1 },
  })),
  examples: examples.map(({ id, ...metadata }) => ({
    ...metadata,
    file: 'family-' + id + '@4x.png',
  })),
  notes: [
    'Дети — старшие братья и сёстры на момент рождения героя; возраст указан примерно.',
    'Имена файлов mother.png и father.png сохранены для совместимости с первым примером.',
    'У всех вырезок одна пиксельная сетка; увеличивать следует без сглаживания.',
    'Примерный состав семьи задаётся массивами parents и siblings в render-scene.mjs.',
  ],
};
writeFileSync(
  fileURLToPath(new URL('family-manifest.json', import.meta.url)),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log('Saved family kit: 4 adults, 6 older children, newborn, 3 example compositions and manifest.');

const sourcePalettes = {
  'adult-woman-01': motherPalette,
  'adult-woman-02': woman02Palette,
  'adult-man-01': fatherPalette,
  'adult-man-02': man02Palette,
  ...Object.fromEntries(children.map(({ id, palette }) => [id, palette])),
};

function paintSlots(id) {
  if (id === 'newborn') {
    return {
      '#eab994': 'skin',
      '#c68f72': 'skinShade',
      '#b47c70': 'mouth',
      '#8a635a': 'eyes',
      '#8f6953': 'hair',
      '#bacba6': 'shirt',
      '#91ac92': 'shirtShade',
      '#e2e4bf': 'shirtLight',
    };
  }

  const palette = sourcePalettes[id];
  const slots = Object.fromEntries([
    ['skin', 'skin'], ['shade', 'skinShade'],
    ['hair', 'hair'], ['hairShade', 'hairShade'], ['hairLight', 'hairLight'],
    ['shirt', 'shirt'], ['shirtShade', 'shirtShade'],
    ['trousers', 'trousers'], ['trouserShade', 'trouserShade'],
  ].map(([source, slot]) => [palette[source], slot]));
  slots['#55454a'] = 'eyes';
  slots['#a7736c'] = 'mouth';

  if (palette.beard) {
    slots['#b88a72'] = 'mouth';
  }

  return slots;
}

function spriteLayers(sprite) {
  const slots = paintSlots(sprite.id);
  const { width, height, pixels } = sprite.image;
  const groups = new Map();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width;) {
      const offset = (y * width + x) * 4;

      if (!pixels[offset + 3]) {
        x += 1;
        continue;
      }

      const color = '#' + pixels.subarray(offset, offset + 3).toString('hex');
      const key = slots[color] ?? color;
      const start = x;
      x += 1;

      while (x < width) {
        const next = (y * width + x) * 4;
        const nextColor = '#' + pixels.subarray(next, next + 3).toString('hex');

        if (!pixels[next + 3] || (slots[nextColor] ?? nextColor) !== key) {
          break;
        }

        x += 1;
      }

      if (!groups.has(key)) {
        groups.set(key, { ...(key.startsWith('#') ? { color: key } : { slot: key }), path: '' });
      }

      const length = x - start;
      groups.get(key).path += `M${start} ${y}h${length}v1h-${length}z`;
    }
  }

  return { width, height, layers: [...groups.values()] };
}

const layers = Object.fromEntries(sprites.map((sprite) => [sprite.id, spriteLayers(sprite)]));
const layerModule = '// Generated by src/assets/birth-scene/pixel-prototype/render-scene.mjs.\n'
  + '// Integer pixel runs; only named paint slots are recolored.\n'
  + 'export const familySpriteLayers = '
  + JSON.stringify(layers, null, 2)
  + ' as const;\n';
writeFileSync(
  fileURLToPath(new URL('../../../data/familySpriteLayers.ts', import.meta.url)),
  layerModule,
);


function recolorSprite(sprite, appearance) {
  const result = canvas(sprite.image.width, sprite.image.height);
  result.pixels.set(sprite.image.pixels);
  const slots = paintSlots(sprite.id);
  const replacements = new Map();

  for (let offset = 0; offset < result.pixels.length; offset += 4) {
    if (!result.pixels[offset + 3]) continue;
    const source = '#' + result.pixels.subarray(offset, offset + 3).toString('hex');
    const slot = slots[source];

    if (!slot) continue;
    if (!replacements.has(slot)) {
      const color = appearance.colors[slot];
      replacements.set(slot, [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16)));
    }

    result.pixels.set(replacements.get(slot), offset);
  }

  return result;
}

const appearanceSheet = canvas(256, 144);

for (let y = 0; y < appearanceSheet.height; y += 8) {
  for (let x = 0; x < appearanceSheet.width; x += 8) {
    appearanceSheet.rect(x, y, 8, 8, (x / 8 + y / 8) % 2 ? '#e5e6e8' : '#f8f5ee');
  }
}

for (let index = 0; index < 6; index += 1) {
  const adultId = index % 2 ? 'adult-man-01' : 'adult-woman-01';
  const childId = index % 2 ? 'boy-age-06' : 'girl-age-06';
  const adultSprite = sprites.find((sprite) => sprite.id === adultId);
  const childSprite = sprites.find((sprite) => sprite.id === childId);
  const adultAppearance = getFamilyAppearance('palette-preview-v1', 'relative:adult-' + index);
  const childAppearance = getFamilyAppearance('palette-preview-v1', 'relative:child-' + index);
  appearanceSheet.paste(recolorSprite(adultSprite, adultAppearance), 12 + index * 40, 63 - adultSprite.image.height);
  appearanceSheet.paste(recolorSprite(childSprite, childAppearance), 16 + index * 40, 132 - childSprite.image.height);
}

save(enlarge(appearanceSheet, 4), 'appearance-sheet@4x.png');


