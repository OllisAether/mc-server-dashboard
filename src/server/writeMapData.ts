import { createWriteStream } from 'fs'
import nbt from 'prismarine-nbt'
import { gzip } from 'zlib'

export async function writeMapData(map: Uint8ClampedArray, path: string) {
  const tag = nbt.comp({
    DataVersion: nbt.int(4440),
    data: nbt.comp({
      colors: nbt.byteArray(Array.from(map).map((color) => color > 127 ? color - 256 : color)),
      dimension: nbt.string('minecraft:overworld'),
      locked: nbt.byte(1),
      trackingPosition: nbt.byte(0),
      xCenter: nbt.int(0),
      zCenter: nbt.int(0),
    })
  }) as nbt.NBT

  const chunk = nbt.writeUncompressed(tag)
  const compressedChunk = await new Promise((resolve) => gzip(chunk, (err, data) => resolve(data)))

  await new Promise<void>((resolve) => {
    const file = createWriteStream(path)
    file.on('finish', resolve)
    file.write(compressedChunk)
    file.end()
  })
}
