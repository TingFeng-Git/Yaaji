import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const svgPath = join(rootDir, 'icons/icon.svg');
const iconsDir = join(rootDir, 'icons');

const sizes = [16, 48, 128];

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const svgBuffer = readFileSync(svgPath);

for (const size of sizes) {
  const outputPath = join(iconsDir, `icon${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`Generated: icons/icon${size}.png`);
}

console.log('Icon generation complete!');