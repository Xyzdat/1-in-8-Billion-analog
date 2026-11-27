import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

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
  skinLight,
  hair,
  hairShade,
  hairLight,
  shirt,
  shirtShade,
  shirtLight,
  trousers,
  trouserShade,
  longHair,
}) {
  const image = canvas(36, 68);
  const r = image.rect;
  const p = (points, color) => shape(image, points, color);
  const outline = '#54434a';

  // Hair behind the face: two different silhouettes, with small highlight clusters.
  if (longHair) {
    p([[11, 2], [24, 2], [28, 6], [29, 16], [27, 22], [29, 28],
      [26, 32], [8, 31], [5, 26], [7, 20], [5, 15], [7, 6]], hairShade);
    p([[11, 4], [23, 4], [26, 8], [26, 21], [24, 26], [26, 29],
      [10, 29], [7, 25], [9, 20], [7, 15], [9, 7]], hair);
    r(10, 6, 3, 3, hairLight);
    r(8, 11, 2, 5, hairLight);
    r(9, 21, 2, 4, hairLight);
    r(11, 26, 3, 2, hairLight);
  } else {
    p([[11, 3], [17, 1], [25, 3], [29, 7], [28, 18], [10, 19],
      [7, 13], [8, 6]], hairShade);
    p([[11, 5], [17, 3], [24, 5], [27, 8], [26, 15], [10, 16],
      [9, 9]], hair);
  }

  // Neck and face in three-quarter view; parents look towards the bassinet.
  r(15, 23, 8, 8, shade);
  r(17, 24, 5, 6, skin);
  p([[13, 8], [24, 8], [27, 11], [27, 17], [29, 19], [27, 21],
    [26, 25], [22, 28], [17, 27], [13, 24], [11, 18], [11, 12]], shade);
  p([[14, 9], [23, 9], [26, 12], [26, 18], [28, 19], [26, 20],
    [25, 24], [21, 26], [17, 25], [14, 22], [12, 17], [12, 12]], skin);
  r(15, 11, 7, 3, skinLight);
  r(15, 14, 3, 3, skinLight);
  r(11, 16, 3, 5, skin);
  r(12, 17, 1, 2, shade);
  r(16, 15, 4, 1, hairShade);
  r(24, 14, 2, 1, hairShade);
  r(17, 17, 3, 2, '#fff0d3');
  r(19, 17, 1, 2, '#453d43');
  r(24, 16, 2, 2, '#fff0d3');
  r(25, 16, 1, 2, '#453d43');
  r(26, 19, 1, 2, skinLight);
  r(24, 21, 2, 1, shade);
  r(16, 21, 3, 1, '#d99480');
  r(22, 24, 3, 1, '#a96662');
  r(24, 23, 1, 1, '#a96662');
  r(21, 25, 2, 1, skinLight);

  if (longHair) {
    p([[11, 6], [23, 5], [26, 9], [20, 9], [17, 12], [13, 13],
      [13, 21], [10, 24], [9, 17], [9, 10]], hair);
    r(14, 7, 6, 1, hairLight);
    r(12, 9, 4, 1, hairLight);
    r(10, 13, 1, 5, hairLight);
    r(11, 22, 1, 3, hairLight);
  } else {
    p([[10, 6], [17, 4], [25, 6], [27, 10], [22, 9], [17, 11],
      [12, 11], [12, 16], [10, 17]], hair);
    r(13, 6, 5, 1, hairLight);
    r(18, 7, 5, 1, hairLight);
    r(11, 10, 1, 4, hairLight);
    r(18, 26, 3, 1, shade);
  }

  // Trouser folds, pockets and shoes with a separate sole.
  p([[11, 45], [27, 45], [28, 52], [26, 64], [20, 64], [19, 52],
    [18, 64], [10, 64]], outline);
  p([[12, 46], [26, 46], [26, 52], [25, 63], [21, 63], [20, 51],
    [17, 51], [16, 63], [11, 63]], trousers);
  r(12, 47, 2, 15, trouserShade);
  r(21, 51, 2, 11, trouserShade);
  r(14, 49, 3, 1, trouserShade);
  r(23, 48, 2, 1, trouserShade);
  r(14, 57, 2, 1, trouserShade);
  r(23, 59, 2, 1, trouserShade);
  p([[10, 63], [17, 63], [18, 65], [17, 67], [7, 67], [7, 65]], outline);
  p([[21, 63], [26, 63], [30, 65], [30, 67], [20, 67], [20, 65]], outline);
  r(10, 64, 6, 1, '#977c6b');
  r(22, 64, 4, 1, '#977c6b');
  r(8, 66, 9, 1, '#cfb99a');
  r(21, 66, 8, 1, '#cfb99a');

  // Layered cardigan: collar, seams, buttons, pockets and rolled cuffs.
  p([[12, 28], [15, 27], [23, 27], [28, 30], [31, 38], [29, 45],
    [27, 49], [10, 49], [7, 45], [5, 38], [7, 31]], outline);
  p([[12, 29], [16, 28], [22, 28], [27, 31], [29, 37], [27, 46],
    [26, 48], [11, 48], [8, 44], [7, 37], [9, 32]], shirtShade);
  p([[12, 30], [16, 29], [22, 29], [26, 32], [26, 46], [12, 46]], shirt);
  p([[16, 29], [22, 29], [21, 34], [18, 35]], '#f6e7cc');
  r(18, 34, 3, 10, '#e6d4b8');
  r(16, 31, 1, 13, shirtLight);
  r(22, 32, 1, 12, shirtShade);
  r(12, 32, 2, 9, shirtLight);
  r(25, 33, 1, 7, shirtLight);
  r(12, 43, 4, 1, shirtShade);
  r(12, 44, 1, 2, shirtShade);
  r(23, 42, 3, 1, shirtShade);
  r(23, 43, 1, 2, shirtShade);
  r(21, 36, 1, 1, '#f0d5b0');
  r(21, 40, 1, 1, '#f0d5b0');
  r(21, 44, 1, 1, '#f0d5b0');
  r(11, 47, 15, 1, shirtShade);

  if (longHair) {
    // Slightly bent arms, hands together in front of the cardigan.
    p([[8, 33], [11, 33], [11, 41], [16, 45], [14, 48], [8, 44],
      [6, 39]], shirt);
    p([[27, 33], [29, 35], [29, 41], [24, 46], [22, 43], [26, 39]], shirt);
    r(8, 35, 1, 5, shirtLight);
    r(10, 42, 3, 2, shirtShade);
    r(25, 41, 3, 2, shirtShade);
    p([[14, 44], [17, 45], [21, 44], [24, 45], [23, 48], [18, 49],
      [14, 47]], shade);
    r(15, 45, 4, 2, skin);
    r(20, 45, 3, 2, skinLight);
    r(18, 47, 4, 1, skin);
  } else {
    p([[8, 33], [11, 33], [10, 43], [8, 46], [6, 44], [6, 38]], shirt);
    p([[27, 33], [29, 34], [30, 41], [28, 46], [25, 44], [26, 39]], shirt);
    r(7, 36, 1, 6, shirtLight);
    r(7, 43, 3, 2, shirtShade);
    r(26, 43, 3, 2, shirtShade);
    r(7, 45, 3, 5, shade);
    r(7, 45, 2, 4, skin);
    r(26, 45, 3, 5, shade);
    r(26, 45, 2, 4, skin);
    r(8, 49, 1, 1, skinLight);
    r(27, 49, 1, 1, skinLight);
  }

  return image;
}

function newborn() {
  const image = canvas(44, 34);
  const r = image.rect;
  const p = (points, color) => shape(image, points, color);

  r(7, 26, 4, 8, '#987052');
  r(33, 26, 4, 8, '#987052');
  r(8, 27, 1, 6, '#ccaa7f');
  r(34, 27, 1, 6, '#ccaa7f');
  r(9, 31, 25, 2, '#ad8761');
  p([[3, 11], [8, 9], [36, 9], [42, 12], [42, 20], [39, 27],
    [35, 29], [8, 29], [4, 26], [1, 19], [1, 14]], '#916849');
  p([[4, 12], [9, 10], [35, 10], [41, 13], [40, 20], [37, 26],
    [9, 27], [5, 24], [2, 18], [2, 14]], '#dfbc8c');
  p([[6, 12], [35, 12], [39, 14], [37, 22], [7, 22], [4, 17]], '#b99a76');
  p([[8, 13], [34, 13], [37, 15], [35, 21], [8, 21], [6, 17]], '#fff0ce');

  // The swaddle has a folded edge and small angular fabric highlights.
  p([[18, 13], [27, 11], [35, 14], [37, 19], [34, 23], [16, 23],
    [13, 19]], '#779580');
  p([[19, 14], [27, 13], [33, 15], [35, 19], [32, 22], [17, 22],
    [15, 18]], '#b3c7a3');
  p([[18, 14], [23, 16], [29, 21], [24, 22], [16, 17]], '#e1e5bc');
  r(28, 16, 4, 1, '#d4dfb6');
  r(31, 18, 3, 1, '#d4dfb6');
  r(20, 21, 3, 1, '#91aa8c');

  // Rounded head, sleeping eyes, cheeks, a tiny hand and a hair tuft.
  p([[12, 5], [19, 5], [23, 8], [23, 13], [20, 17], [14, 18],
    [10, 15], [9, 9]], '#c88e70');
  p([[12, 6], [19, 6], [22, 9], [21, 13], [19, 16], [14, 16],
    [11, 13], [10, 9]], '#efbc91');
  r(12, 8, 5, 2, '#ffd3a5');
  r(13, 5, 5, 1, '#8c6550');
  r(12, 6, 2, 1, '#8c6550');
  r(14, 4, 2, 1, '#8c6550');
  r(12, 12, 3, 1, '#8b6159');
  r(13, 13, 2, 1, '#8b6159');
  r(18, 11, 3, 1, '#8b6159');
  r(18, 12, 2, 1, '#8b6159');
  r(16, 13, 1, 1, '#d19476');
  r(17, 15, 2, 1, '#b57b71');
  r(11, 14, 2, 1, '#df9b81');
  r(20, 13, 2, 1, '#df9b81');
  r(23, 15, 4, 3, '#d69c7b');
  r(23, 15, 3, 2, '#f1c299');

  // Foreground rails stay below the baby's face.
  r(4, 21, 35, 2, '#f4d5a2');
  r(7, 23, 30, 4, '#d0aa7c');
  for (let x = 8; x <= 34; x += 5) {
    r(x, 23, 2, 4, '#f1d1a0');
    r(x + 2, 24, 1, 3, '#b88e64');
  }
  r(7, 27, 30, 1, '#af815b');

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

const mother = adult({
  skin: '#e2af8c',
  shade: '#c58d75',
  skinLight: '#f8c8a0',
  hair: '#765548',
  hairShade: '#513e3d',
  hairLight: '#b28662',
  shirt: '#c38f85',
  shirtShade: '#a77370',
  shirtLight: '#dba99a',
  trousers: '#7f8d7d',
  trouserShade: '#626e66',
  longHair: true,
});
const father = mirror(adult({
  skin: '#c99978',
  shade: '#ac7c64',
  skinLight: '#e6b38a',
  hair: '#51463f',
  hairShade: '#38353b',
  hairLight: '#82705b',
  shirt: '#829da7',
  shirtShade: '#657f8d',
  shirtLight: '#a9bec2',
  trousers: '#686879',
  trouserShade: '#4e5266',
  longHair: false,
}));
const baby = newborn();
const background = room();
const scene = room();
scene.paste(mother, 65, 49);
scene.paste(father, 158, 49);
scene.paste(baby, 106, 89);

save(background, 'background.png');
save(mother, 'mother.png');
save(father, 'father.png');
save(baby, 'newborn.png');
save(scene, 'scene.png');
save(enlarge(scene, 4), 'scene@4x.png');

console.log('Created 6 pixel PNGs. Scene: 256 × 144, preview: 1024 × 576; transparent characters.');
