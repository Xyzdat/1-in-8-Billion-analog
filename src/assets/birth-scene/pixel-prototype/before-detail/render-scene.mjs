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

function adult({ skin, shade, hair, shirt, shirtShade, trousers, longHair }) {
  const image = canvas(22, 45);
  const r = image.rect;

  r(7, 1, 9, 2, hair);
  r(5, 3, 12, 8, hair);
  r(7, 5, 9, 9, skin);
  r(6, 7, 2, 5, skin);
  r(14, 9, 2, 4, shade);
  r(13, 8, 1, 1, '#403745');
  r(13, 12, 2, 1, '#a56361');
  r(7, 4, 7, 2, hair);

  if (longHair) {
    r(4, 6, 3, 12, hair);
    r(6, 12, 2, 7, hair);
  } else {
    r(5, 4, 3, 5, hair);
  }

  r(9, 14, 4, 3, skin);
  r(6, 17, 11, 14, shirt);
  r(4, 18, 3, 12, shirtShade);
  r(16, 18, 3, 11, shirtShade);
  r(7, 18, 2, 12, shirtShade);
  r(10, 18, 3, 4, '#f1e8d5');
  r(12, 24, 1, 1, shirtShade);
  r(12, 28, 1, 1, shirtShade);
  r(4, 30, 3, 5, skin);
  r(16, 29, 3, 5, skin);
  r(7, 31, 4, 11, trousers);
  r(13, 31, 4, 11, trousers);
  r(6, 41, 6, 3, '#51484d');
  r(13, 41, 6, 3, '#51484d');

  return image;
}

function newborn() {
  const image = canvas(34, 27);
  const r = image.rect;

  r(5, 22, 3, 5, '#9f745d');
  r(26, 22, 3, 5, '#9f745d');
  r(3, 8, 28, 15, '#b78a69');
  r(2, 9, 30, 3, '#d8b48c');
  r(5, 12, 24, 9, '#f1dfbc');
  r(8, 11, 18, 4, '#fff2d5');
  r(10, 7, 13, 9, '#a6bfa8');
  r(12, 6, 8, 10, '#d4dfbd');
  r(8, 5, 8, 7, '#e9b998');
  r(10, 4, 5, 2, '#815b4c');
  r(9, 8, 2, 1, '#815b4c');
  r(13, 8, 2, 1, '#815b4c');
  r(6, 14, 2, 7, '#d1b389');
  r(12, 14, 2, 7, '#d1b389');
  r(20, 14, 2, 7, '#d1b389');
  r(26, 14, 2, 7, '#d1b389');
  r(3, 21, 28, 2, '#9f745d');

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
  shirt: '#c38f85',
  shirtShade: '#a77370',
  trousers: '#7f8d7d',
  longHair: true,
});
const father = mirror(adult({
  skin: '#c99978',
  shade: '#ac7c64',
  hair: '#51463f',
  shirt: '#829da7',
  shirtShade: '#657f8d',
  trousers: '#686879',
  longHair: false,
}));
const baby = newborn();
const background = room();
const scene = room();
scene.paste(mother, 76, 72);
scene.paste(father, 161, 72);
scene.paste(baby, 112, 96);

save(background, 'background.png');
save(mother, 'mother.png');
save(father, 'father.png');
save(baby, 'newborn.png');
save(scene, 'scene.png');
save(enlarge(scene, 4), 'scene@4x.png');

console.log('Created 6 pixel PNGs. Scene: 256 × 144, preview: 1024 × 576; transparent characters.');
