import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "public", "icons", "w98");
const width = 32;
const height = 32;
const pixels = Buffer.alloc(width * height * 4);

function setPixel(x, y, [red, green, blue, alpha = 255]) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const offset = (y * width + x) * 4;
  pixels[offset] = red;
  pixels[offset + 1] = green;
  pixels[offset + 2] = blue;
  pixels[offset + 3] = alpha;
}

function fillRect(left, top, rectWidth, rectHeight, color) {
  for (let y = top; y < top + rectHeight; y += 1) {
    for (let x = left; x < left + rectWidth; x += 1) setPixel(x, y, color);
  }
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const [currentX, currentY] = polygon[current];
    const [previousX, previousY] = polygon[previous];
    const intersects = currentY > y !== previousY > y
      && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;
    if (intersects) inside = !inside;
  }
  return inside;
}

// A tiny original VGA-palette chess program icon: a beveled board and knight.
fillRect(3, 5, 26, 26, [0, 0, 0]);
fillRect(3, 5, 25, 25, [255, 255, 255]);
fillRect(5, 7, 23, 23, [128, 128, 128]);
fillRect(5, 7, 21, 21, [192, 192, 192]);
for (let row = 0; row < 4; row += 1) {
  for (let column = 0; column < 4; column += 1) {
    fillRect(6 + column * 5, 8 + row * 5, 5, 5, (row + column) % 2 ? [0, 0, 128] : [255, 255, 255]);
  }
}

const knight = [[12, 3], [18, 4], [23, 8], [24, 12], [21, 16], [18, 18], [20, 23], [24, 25], [24, 28], [8, 28], [8, 25], [11, 22], [12, 17], [9, 14], [9, 10]];
for (let y = 2; y < 29; y += 1) {
  for (let x = 7; x < 25; x += 1) {
    if (pointInPolygon(x + 0.5, y + 0.5, knight)) setPixel(x, y, [0, 0, 0]);
  }
}
fillRect(13, 7, 2, 2, [255, 255, 255]);
fillRect(16, 11, 5, 2, [128, 128, 128]);
fillRect(10, 25, 12, 2, [128, 128, 128]);

const source = sharp(pixels, { raw: { width, height, channels: 4 } });
await source.clone().png({ palette: true, colours: 16 }).toFile(path.join(outputDirectory, "w98_chess-32.png"));
await source.clone().resize(16, 16, { kernel: sharp.kernel.nearest }).png({ palette: true, colours: 16 }).toFile(path.join(outputDirectory, "w98_chess-16.png"));

