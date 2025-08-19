import { createCanvas, ImageData } from 'canvas'
import { colors } from '../shared/mapColors.js'

export function createPreview(maps: Uint8ClampedArray[], width: number, height: number) {
  const canvas = createCanvas(width * 128, height * 128)
  const ctx = canvas.getContext('2d')

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mapData = maps[y * width + x]

      const imageData = mapDataToImageData(mapData)
      ctx.putImageData(imageData, x * 128, y * 128)
    }
  }

  return canvas.createPNGStream()
}

function mapDataToImageData(mapData: Uint8ClampedArray) {
  const imageData = new ImageData(128, 128)

  for (let i = 0; i < mapData.length; i++) {
    const colorId = mapData[i]
    const color = colors.find((c) => c.id === colorId)?.color || [0, 0, 0, 255]

    imageData.data[i * 4] = color[0] // Red
    imageData.data[i * 4 + 1] = color[1] // Green
    imageData.data[i * 4 + 2] = color[2] // Blue
    imageData.data[i * 4 + 3] = 255 // Alpha
  }

  return imageData
}
