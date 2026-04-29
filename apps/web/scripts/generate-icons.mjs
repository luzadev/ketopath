// Genera i PNG dell'icona PWA a partire dalle SVG sorgente.
// Eseguilo dopo aver modificato icon.svg / icon-maskable.svg.
//
//   pnpm --filter @ketopath/web exec node scripts/generate-icons.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ICONS = path.join(here, '..', 'public', 'icons');

const targets = [
  { src: 'icon.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon.svg', out: 'icon-512.png', size: 512 },
  { src: 'icon.svg', out: 'apple-touch-icon.png', size: 180 },
  { src: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512 },
  { src: 'icon-maskable.svg', out: 'badge-72.png', size: 72 },
];

for (const t of targets) {
  const svg = await readFile(path.join(PUBLIC_ICONS, t.src));
  const png = await sharp(svg, { density: 384 }).resize(t.size, t.size).png().toBuffer();
  await writeFile(path.join(PUBLIC_ICONS, t.out), png);
  // eslint-disable-next-line no-console
  console.info(`✓ ${t.out} (${t.size}×${t.size})`);
}
