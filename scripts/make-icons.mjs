import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function hex(color) {
  return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]
}

function setPx(rgba, size, x, y, rgb) {
  if (x < 0 || y < 0 || x >= size || y >= size) return
  const i = (y * size + x) * 4
  rgba[i] = rgb[0]
  rgba[i + 1] = rgb[1]
  rgba[i + 2] = rgb[2]
  rgba[i + 3] = 255
}

function fillRoundRect(rgba, size, x, y, w, h, r, rgb) {
  const x1 = Math.round(x)
  const y1 = Math.round(y)
  const x2 = Math.round(x + w)
  const y2 = Math.round(y + h)
  const radius = Math.max(0, Math.round(r))
  for (let py = y1; py < y2; py++) {
    for (let px = x1; px < x2; px++) {
      const dx = px < x1 + radius ? x1 + radius - px : px >= x2 - radius ? px - (x2 - radius - 1) : 0
      const dy = py < y1 + radius ? y1 + radius - py : py >= y2 - radius ? py - (y2 - radius - 1) : 0
      if (dx && dy && dx * dx + dy * dy > radius * radius) continue
      setPx(rgba, size, px, py, rgb)
    }
  }
}

function strokeRoundRect(rgba, size, x, y, w, h, r, rgb, width) {
  const inset = width / 2
  fillRoundRect(rgba, size, x, y, w, h, r, rgb)
  fillRoundRect(rgba, size, x + width, y + width, w - width * 2, h - width * 2, Math.max(0, r - inset), hex('#1d2b24'))
}

function paint(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const s = size / 512
  fillRoundRect(rgba, size, 0, 0, size, size, 108 * s, hex('#0e1612'))
  strokeRoundRect(rgba, size, 118 * s, 96 * s, 276 * s, 320 * s, 28 * s, hex('#7dce9f'), 18 * s)
  fillRoundRect(rgba, size, 156 * s, 156 * s, 200 * s, 22 * s, 11 * s, hex('#7dce9f'))
  fillRoundRect(rgba, size, 156 * s, 210 * s, 164 * s, 16 * s, 8 * s, hex('#9aaf9f'))
  fillRoundRect(rgba, size, 156 * s, 248 * s, 188 * s, 16 * s, 8 * s, hex('#9aaf9f'))
  fillRoundRect(rgba, size, 156 * s, 286 * s, 120 * s, 16 * s, 8 * s, hex('#d4b46a'))
  return encodePng(size, size, rgba)
}

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'icon-192.png'), paint(192))
writeFileSync(join(outDir, 'icon-512.png'), paint(512))
console.log('wrote public/icons/icon-192.png and icon-512.png')
