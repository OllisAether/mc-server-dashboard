const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null

function toBase64(data: string) {
  if (isNode) {
    return Buffer.from(data, 'binary').toString('base64')
  } else {
    return btoa(data)
  }
}

function fromBase64(data: string) {
  if (isNode) {
    return Buffer.from(data, 'base64').toString('binary')
  } else {
    return atob(data)
  }
}

async function zip(data: Uint8ClampedArray) {
  if (isNode) {
    const { gzip } = await import('node:zlib')
    return await new Promise<number[]>((resolve, reject) => gzip(data, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(Array.from(result))
      }
    }))
  } else {
    const { zip } = await import('gzip-js')
    return zip(Array.from(data))
  }
}

async function unzip(data: Uint8ClampedArray) {
  if (isNode) {
    const { gunzip } = await import('node:zlib')
    return await new Promise<Uint8ClampedArray>((resolve, reject) => {
      gunzip(data, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(new Uint8ClampedArray(result))
        }
      })
    })
  } else {
    const { unzip } = await import('gzip-js')
    return new Uint8ClampedArray(unzip(Array.from(data)))
  }
}

export async function compressMap(maps: Uint8ClampedArray[], width: number, height: number) {
  return `${width};${height};` + (await Promise.all(
    maps.map(async(map) => toBase64((await zip(map))
      .map((chunk) => String.fromCharCode(chunk))
      .join(''))))
  ).join(';')
}

export async function decompressMap(data: string) {
  const [w, h, ...maps] = data.split(';')
  const result: Uint8ClampedArray[] = []

  for (const map of maps) {
    const decoded = fromBase64(map)
    const uint8Array = new Uint8ClampedArray(decoded.length)

    for (let i = 0; i < decoded.length; i++) {
      uint8Array[i] = decoded.charCodeAt(i)
    }

    result.push(await unzip(uint8Array))
  }

  return {
    width: +w,
    height: +h,
    maps: result
  }
}
