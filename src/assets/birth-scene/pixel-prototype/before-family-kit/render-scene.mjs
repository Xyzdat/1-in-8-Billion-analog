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
  hair,
  hairShade,
  hairLight,
  shirt,
  shirtShade,
  trousers,
  trouserShade,
  longHair,
}) {
  const image = canvas(28, 56);
  const r = image.rect;
  const p = (points, color) => shape(image, points, color);

  // Broad hair shapes with just one light accent.
  if (longHair) {
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

  if (longHair) {
    p([[9, 5], [18, 4], [21, 7], [16, 8], [12, 11], [11, 18],
      [9, 20], [8, 14], [7, 10]], hair);
    r(10, 6, 4, 1, hairLight);
    r(8, 11, 1, 4, hairLight);
  } else {
    p([[9, 5], [16, 4], [21, 6], [22, 9], [17, 8], [13, 10],
      [10, 10], [10, 14], [8, 14]], hair);
    r(10, 5, 5, 1, hairLight);
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

const mother = adult({
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
});
const father = mirror(adult({
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
}));
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

console.log('Created 6 pixel PNGs. Scene: 256 × 144, preview: 1024 × 576; transparent characters.');
