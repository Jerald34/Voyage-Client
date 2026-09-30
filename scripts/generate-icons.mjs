/**
 * Voyage PWA Icon Generator
 *
 * Requires: npm install --save-dev sharp
 * Run:      node scripts/generate-icons.mjs
 *
 * Source:   scripts/icon-sources/*.svg  (the "Hops" logo, from the brand kit in docs/brand/logo)
 * Output:   public/icons/               (all PWA icon sizes)
 *
 * Each icon renders from the SVG drawn for its job, so nothing is cropped or re-centred here:
 *   tile.svg        rounded navy tile, full detail           -> "any" icons
 *   full-bleed.svg  square navy background, full detail      -> iOS (it applies its own mask)
 *   maskable.svg    full-bleed, mark inside the 80% safe zone -> Android adaptive icons
 *   small.svg       simplified cut (no hops) for <48 px      -> favicons; also public/icon.svg
 *   og.svg          1200×630 social preview
 *
 * After regenerating, bump CACHE_VERSION in public/sw.js (cache-first for /public images).
 */

import sharp from 'sharp';
import { mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC  = join(__dirname, 'icon-sources');
const DEST = process.env.ICON_OUT || join(ROOT, 'public', 'icons');

// Ensure output directory exists
if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true });

const ICONS = [
  // Standard PWA icons
  { name: 'icon-192.png',          size: 192, src: 'tile.svg' },
  { name: 'icon-512.png',          size: 512, src: 'tile.svg' },

  // Maskable icons: the mark stays inside Android's adaptive-icon safe zone (circle, r = 40%)
  { name: 'icon-maskable-192.png', size: 192, src: 'maskable.svg' },
  { name: 'icon-maskable-512.png', size: 512, src: 'maskable.svg' },

  // Apple touch icon (iOS applies its own rounded-square mask)
  { name: 'apple-touch-icon.png',  size: 180, src: 'full-bleed.svg' },

  // Favicon sizes: the simplified small-size cut
  { name: 'favicon-32.png',        size: 32,  src: 'small.svg' },
  { name: 'favicon-16.png',        size: 16,  src: 'small.svg' },
];

async function render(src, name, width, height) {
  // Rasterise well above the target size, then downscale for clean edges.
  const density = Math.ceil((72 * Math.max(width, height) * 4) / 256);
  await sharp(join(SRC, src), { density })
    .resize(width, height)
    .png()
    .toFile(join(DEST, name));
  console.log(`✓ ${name}  (${width}×${height})`);
}

async function main() {
  console.log('\nGenerating Voyage PWA icons…\n');
  for (const { name, size, src } of ICONS) {
    await render(src, name, size, size);
  }
  await render('og.svg', 'og-image.png', 1200, 630);
  if (!process.env.ICON_OUT) {
    copyFileSync(join(SRC, 'small.svg'), join(ROOT, 'public', 'icon.svg'));
    console.log('✓ public/icon.svg');
  }
  console.log('\nDone! Remember to bump CACHE_VERSION in public/sw.js.\n');
}

main().catch(err => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
