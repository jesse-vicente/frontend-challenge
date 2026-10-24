/**
 * Converts the original Figma exports (design/source, PNG 1254px) into the
 * WebP renditions served by the app. Visual content is unchanged; only format
 * and resolution are adapted for performance (see ARCHITECTURE.md).
 */
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SOURCE_DIR = 'design/source'
const OUTPUT_DIR = 'public/images/nfts'
const WIDTHS = [400, 800]

await mkdir(OUTPUT_DIR, { recursive: true })
const files = (await readdir(SOURCE_DIR)).filter((file) => /^nft-\d+\.png$/.test(file))

for (const file of files) {
  const name = path.basename(file, '.png')
  for (const width of WIDTHS) {
    const suffix = width === Math.max(...WIDTHS) ? '' : `-${width}`
    const output = path.join(OUTPUT_DIR, `${name}${suffix}.webp`)
    const info = await sharp(path.join(SOURCE_DIR, file)).resize(width).webp({ quality: 78 }).toFile(output)
    console.info(`${output} ${Math.round(info.size / 1024)} KB`)
  }
}
