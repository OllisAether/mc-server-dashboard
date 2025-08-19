import express from 'express'
import ViteExpress from 'vite-express'
import dotenv from 'dotenv'
import expressBasicAuth from 'express-basic-auth'
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises'
import { writeMapData } from './writeMapData.js'
import path from 'path'
import { decompressMap } from '../shared/compressMap.js'
import { createPreview } from './createPreview.js'
import { createReadStream, createWriteStream } from 'fs'
import { Painting } from '../shared/paintings.js'

const app = express()

dotenv.config()

app.use(expressBasicAuth({
  users: {
    '': process.env.PASSWORD!
  },
  challenge: true
}))
app.use(express.text({limit: '50mb'}))

const worldDirectory = process.env.WORLD_PATH!
const customPaintingsPath = path.join(worldDirectory, 'custom_paintings')
const customPaintingsPreviewsPath = path.join(customPaintingsPath, 'previews')

if (!(await stat(customPaintingsPath).catch(() => ({ isDirectory: () => false }))).isDirectory()) {
  console.log('Custom paintings directory does not exist. Creating...')
  await mkdir(customPaintingsPath)
}

if (!(await stat(customPaintingsPreviewsPath).catch(() => ({ isDirectory: () => false }))).isDirectory()) {
  console.log('Custom paintings previews directory does not exist. Creating...')
  await mkdir(customPaintingsPreviewsPath)
}

let paintings: Painting[] = []
async function getPaintings() {
  paintings = await Promise.all((await readdir(customPaintingsPath))
    .filter((file) => file.endsWith('.json'))
    .map(async(file) => JSON.parse(await readFile(path.join(customPaintingsPath, file), 'utf-8'))))
  return paintings
}

async function addPainting(painting: Painting) {
  await writeFile(path.join(customPaintingsPath, `${crypto.randomUUID()}.json`), JSON.stringify(painting, null, 2))
  paintings.push(painting)
  await getPaintings()
}

app.get('/api/paintings', async(req, res) => {
  try {
    const paintings = await getPaintings()
    res.json(paintings)
  } catch {
    res.json([])
  }
})

app.post('/api/paintings', async(req, res) => {
  const {
    width,
    height,
    maps
  } = await decompressMap(req.body)

  const dataDir = await readdir(path.join(worldDirectory, 'data'))
  const mapFiles = dataDir.filter((file) => file.startsWith('map_-') && file.endsWith('.dat'))
  const mapIds = mapFiles.map((file) => parseInt(file.split('-')[1].split('.')[0]))

  const nextMapId = mapIds.length > 0 ? Math.max(...mapIds) + 1 : 1

  for (let i = 0; i < maps.length; i++) {
    const map = maps[i]
    await writeMapData(map, path.join(worldDirectory, 'data', `map_-${nextMapId + i}.dat`))
  }

  const file = createWriteStream(path.join(customPaintingsPreviewsPath, `${nextMapId}.png`))
  const stream = createPreview(maps, width, height)
  stream.pipe(file)
  await new Promise<void>((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', (error) => {
      console.error('Error occurred while creating preview:', error)
      reject()
    })
  })
  await new Promise<void>((resolve) => {file.end(() => resolve())})

  await addPainting({
    width,
    height,
    compressed: req.body,
    id: nextMapId,
    previewUrl: `/api/paintings/preview/${nextMapId}.png`
  })

  res.status(200).send(nextMapId.toString())
})

app.get('/api/paintings/preview/:file', (req, res) => {
  const { file } = req.params
  const stream = createReadStream(path.join(customPaintingsPreviewsPath, file))
  stream.pipe(res)
})

ViteExpress.listen(app, 3000, () =>
  console.log('Server is listening on port 3000...'),
)
