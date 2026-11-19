// Gera versões otimizadas (WebP + JPG) das fotos em media-src/ para public/media/.
// Uso: node scripts/optimize-media.mjs
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { join, parse } from 'node:path';

const SRC = 'media-src';
const OUT = 'public/media';
mkdirSync(OUT, { recursive: true });

const widths = [480, 768];
for (const file of readdirSync(SRC)) {
  if (!/\.(jpe?g|png)$/i.test(file)) continue;
  const { name } = parse(file);
  const img = sharp(join(SRC, file));
  const meta = await img.metadata();
  for (const w of widths) {
    const width = Math.min(w, meta.width);
    await sharp(join(SRC, file)).resize({ width }).webp({ quality: 82 }).toFile(join(OUT, `${name}-${w}.webp`));
  }
  await sharp(join(SRC, file)).resize({ width: Math.min(768, meta.width) }).jpeg({ quality: 84, mozjpeg: true }).toFile(join(OUT, `${name}.jpg`));
  console.log('ok', name, meta.width, meta.height);
}
