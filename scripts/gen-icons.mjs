// Rasterise the Spartan lambda source SVG into PWA icon PNGs.
// Run: node scripts/gen-icons.mjs
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, 'icon-source.svg')
const outDir = join(here, '..', 'public', 'icons')

const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'maskable-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

const svg = await readFile(src)
await mkdir(outDir, { recursive: true })

for (const { file, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(outDir, file))
  console.log(`✓ ${file} (${size}×${size})`)
}
console.log('done')
