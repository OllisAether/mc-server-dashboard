export type DitherKind = 'floydSteinberg' | 'bayer2x2' | 'bayer4x4' | 'bayer8x8' | 'atkinson' | 'none'

// Finds the nearest color in the palette (Euclidean distance in RGB)
export function nearestColor(r: number, g: number, b: number, palette: [number, number, number][]) {
  // Luminance-weighted squared distance (approx perceptual)
  const wr = 0.2126; const wg = 0.7152; const wb = 0.0722
  let minD = Infinity
  let pr = 0; let pg = 0; let pb = 0
  for (let i = 0; i < palette.length; i++) {
    const c = palette[i]
    const dr = r - c[0]
    const dg = g - c[1]
    const db = b - c[2]
    const d = wr * dr * dr + wg * dg * dg + wb * db * db
    if (d < minD) {
      minD = d
      pr = c[0]; pg = c[1]; pb = c[2]
      if (d === 0) break
    }
  }
  return [pr, pg, pb] as [number, number, number]
}

function clamp255(x: number) {
  return x < 0 ? 0 : x > 255 ? 255 : x
}

// Ordered dithering Bayer matrices normalized to [-0.5, 0.5]
const BAYER_2x2 = [
  [0, 2],
  [3, 1]
].map((row) => row.map((v) => (v + 0.5) / 4 - 0.5))

const BAYER_4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
].map((row) => row.map((v) => (v + 0.5) / 16 - 0.5))

const BAYER_8x8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
].map((row) => row.map((v) => (v + 0.5) / 64 - 0.5))

export function quantize(
  imageData: ImageData,
  palette: [number, number, number][],
  dither: DitherKind = 'atkinson'
): ImageData {
  const { width, height, data: src } = imageData
  const numPx = width * height

  // Working buffers for error diffusion (RGB only)
  const wr = new Float32Array(numPx)
  const wg = new Float32Array(numPx)
  const wb = new Float32Array(numPx)
  const out = new Uint8ClampedArray(src.length)

  for (let i = 0, j = 0; i < numPx; i++, j += 4) {
    wr[i] = src[j]
    wg[i] = src[j + 1]
    wb[i] = src[j + 2]
    out[j + 3] = src[j + 3] // preserve alpha
  }

  const writeOut = (i: number, r: number, g: number, b: number) => {
    const j = i << 2
    out[j] = r
    out[j + 1] = g
    out[j + 2] = b
  }

  if (dither === 'none') {
    for (let i = 0; i < numPx; i++) {
      const [rQ, gQ, bQ] = nearestColor(wr[i], wg[i], wb[i], palette)
      writeOut(i, rQ, gQ, bQ)
    }
    return new ImageData(out, width, height)
  }

  if (dither === 'bayer2x2' || dither === 'bayer4x4' || dither === 'bayer8x8') {
    const mat = dither === 'bayer2x2' ? BAYER_2x2
      : dither === 'bayer4x4' ? BAYER_4x4 : BAYER_8x8
    // Scale bias relative to matrix size; keep small to avoid hue shifts
    const strength = 32

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        const t = mat[y % mat.length][x % mat[0].length] // in [-0.5, 0.5]
        const bias = t * strength
        // Apply bias along luminance (equal channel shift)
        const r = clamp255(wr[i] + bias)
        const g = clamp255(wg[i] + bias)
        const b = clamp255(wb[i] + bias)
        const [rQ, gQ, bQ] = nearestColor(r, g, b, palette)
        writeOut(i, rQ, gQ, bQ)
      }
    }
    return new ImageData(out, width, height)
  }

  // Error diffusion dithering (Floyd–Steinberg or Atkinson)
  const distributeFS = (idx: number, er: number, eg: number, eb: number) => {
    const x = idx % width
    const y = (idx / width) | 0
    // Right (x+1, y) * 7/16
    if (x + 1 < width) {
      const i1 = idx + 1
      wr[i1] += (er * 7) / 16; wg[i1] += (eg * 7) / 16; wb[i1] += (eb * 7) / 16
    }
    // Bottom-left (x-1, y+1) * 3/16
    if (x - 1 >= 0 && y + 1 < height) {
      const i2 = idx + width - 1
      wr[i2] += (er * 3) / 16; wg[i2] += (eg * 3) / 16; wb[i2] += (eb * 3) / 16
    }
    // Bottom (x, y+1) * 5/16
    if (y + 1 < height) {
      const i3 = idx + width
      wr[i3] += (er * 5) / 16; wg[i3] += (eg * 5) / 16; wb[i3] += (eb * 5) / 16
    }
    // Bottom-right (x+1, y+1) * 1/16
    if (x + 1 < width && y + 1 < height) {
      const i4 = idx + width + 1
      wr[i4] += er / 16; wg[i4] += eg / 16; wb[i4] += eb / 16
    }
  }

  const distributeAtkinson = (idx: number, er: number, eg: number, eb: number) => {
    const x = idx % width
    const y = (idx / width) | 0
    const push = (dx: number, dy: number) => {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const ni = idx + dy * width + dx
        wr[ni] += er / 8; wg[ni] += eg / 8; wb[ni] += eb / 8
      }
    }
    push(1, 0)
    push(2, 0)
    push(-1, 1)
    push(0, 1)
    push(1, 1)
    push(0, 2)
  }

  const distribute = dither === 'atkinson' ? distributeAtkinson : distributeFS

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const r = clamp255(wr[i])
      const g = clamp255(wg[i])
      const b = clamp255(wb[i])
      const [rQ, gQ, bQ] = nearestColor(r, g, b, palette)
      writeOut(i, rQ, gQ, bQ)
      const er = r - rQ
      const eg = g - gQ
      const eb = b - bQ
      distribute(i, er, eg, eb)
    }
  }

  return new ImageData(out, width, height)
}

export default quantize

onmessage = (event: MessageEvent) => {
  const { imageData, palette, dither } = event.data
  const result = quantize(imageData, palette, dither)
  postMessage(result)
}
