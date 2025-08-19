import { onlyColors, colors } from '../shared/mapColors'
import { nearestColor } from './quantize'

export function toMap(imageData: ImageData) {
  const pixels = new Uint8ClampedArray(imageData.data.length / 4)

  for (let i = 0, j = 0; j < imageData.data.length; i++, j += 4) {
    const r = imageData.data[j]
    const g = imageData.data[j + 1]
    const b = imageData.data[j + 2]

    // Find the nearest color in the palette
    const nearest = nearestColor(r, g, b, onlyColors)

    const id = colors.find((c) => c.color[0] === nearest[0] && c.color[1] === nearest[1] && c.color[2] === nearest[2])?.id

    if (!id) {
      throw new Error(`Unknown color: ${nearest}; ${r}, ${g}, ${b}`)
    }

    pixels[i] = id
  }

  return pixels
}

export function toMaps(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const maps: Uint8ClampedArray[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const slice = ctx.getImageData(x * 128, y * 128, 128, 128)
      const mapData = toMap(slice)
      maps.push(mapData)
    }
  }

  return maps
}
