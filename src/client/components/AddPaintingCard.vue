<script lang="ts" setup>
import { useResizeObserver } from '@vueuse/core'
import { ref, watchEffect } from 'vue'
import { VColorInput } from 'vuetify/labs/VColorInput'
import { baseColors, onlyColors } from '../../shared/mapColors'
import quantize from '../quantize?worker'
import { toMaps } from '../toMap'
import { DitherKind } from '../quantize'
import { compressMap } from '../../shared/compressMap'
import { VFileUpload } from 'vuetify/labs/VFileUpload'

const file = ref<File>()

const width = ref<number>(1)
const height = ref<number>(1)

const showGrid = ref<boolean>(true)

const dither = ref<DitherKind>('atkinson')

const fit = ref<'contain' | 'cover' | 'stretch'>('cover')
const bgColor = ref<string>('#000000')

const canvasContainer = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasOverlay = ref<HTMLDivElement | null>(null)

const image = ref<HTMLImageElement | null>(null)

const contrast = ref<number>(1)
const brightness = ref<number>(1)
const saturation = ref<number>(1)

watchEffect(() => {
  if (file.value) {
    const img = new Image()
    img.src = URL.createObjectURL(file.value)
    img.onload = () => {
      image.value = img
      URL.revokeObjectURL(img.src) // Clean up the object URL
    }
  } else {
    image.value = null
  }
})

useResizeObserver(canvasContainer, () => {
  setSize()
})

function setSize() {
  if (!canvas.value || !canvasContainer.value) return

  const parentWidth = canvasContainer.value.offsetWidth || 0
  const parentHeight = canvasContainer.value.offsetHeight || 0
  const scale = Math.min(parentWidth / canvas.value.width, parentHeight / canvas.value.height)
  canvas.value.style.width = `${width.value * 128 * scale}px`
  canvas.value.style.height = `${height.value * 128 * scale}px`

  if (canvasOverlay.value) {
    canvasOverlay.value.style.width = `${width.value * 128 * scale}px`
    canvasOverlay.value.style.height = `${height.value * 128 * scale}px`
  }
}

const loading = ref(false)
async function updateCanvas(onCleanup: (cb: () => void) => void) {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || !canvas.value) return

  loading.value = true

  canvas.value.width = width.value * 128
  canvas.value.height = height.value * 128

  setSize()

  if (!image.value) {
    ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)
    ctx.font = Math.min(canvas.value.width, canvas.value.height) / 10 + 'px Arial'
    ctx.fillStyle = 'black'
    ctx.textAlign = 'center'
    ctx.fillText('No Image', width.value * 64, height.value * 64)
    loading.value = false
    return
  }

  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  ctx.filter = `contrast(${contrast.value}) brightness(${brightness.value}) saturate(${saturation.value})`

  switch (fit.value) {
    case 'contain':
      ctx.fillStyle = bgColor.value
      ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)

      const containScale = Math.min(canvas.value.width / image.value.width, canvas.value.height / image.value.height)
      const x1 = (canvas.value.width / 2) - (image.value.width / 2) * containScale
      const y1 = (canvas.value.height / 2) - (image.value.height / 2) * containScale
      ctx.drawImage(image.value, x1, y1, image.value.width * containScale, image.value.height * containScale)
      break
    case 'cover':
      const scale = Math.max(canvas.value.width / image.value.width, canvas.value.height / image.value.height)
      const x2 = (canvas.value.width / 2) - (image.value.width / 2) * scale
      const y2 = (canvas.value.height / 2) - (image.value.height / 2) * scale
      ctx.drawImage(image.value, x2, y2, image.value.width * scale, image.value.height * scale)
      break
    case 'stretch':
      ctx.drawImage(image.value, 0, 0, canvas.value.width, canvas.value.height)
  }

  // Quantize
  const quantizeWorker = new quantize()
  quantizeWorker.postMessage({
    imageData: ctx.getImageData(0, 0, canvas.value.width, canvas.value.height),
    palette: onlyColors,
    dither: dither.value
  })

  onCleanup(() => {
    quantizeWorker.terminate()
  })

  const quantizedImageData = await new Promise<ImageData>((resolve) => {
    quantizeWorker.onmessage = (event) => {
      resolve(event.data)
    }
  })
  ctx.putImageData(quantizedImageData, 0, 0)

  loading.value = false
}

watchEffect((onCleanup) => {
  updateCanvas(onCleanup)
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', id: number): void
}>()

const submitting = ref(false)
async function submit() {
  submitting.value = true
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || !canvas.value) return

  const maps = toMaps(ctx, width.value, height.value)

  const res = await fetch('/api/paintings', {
    method: 'POST',
    body: await compressMap(maps, width.value, height.value),
    headers: {
      'Content-Type': 'text/plain'
    }
  })
  submitting.value = false
  emit('submit', +(await res.text()))
  emit('close')
}
</script>

<template>
  <VCard>
    <VToolbar>
      <VToolbarTitle>Add Painting</VToolbarTitle>

      <VBtn
        icon
        @click="emit('close')"
      >
        <VIcon>mdi-close</VIcon>
      </VBtn>
    </VToolbar>

    <VCardText>
      <VRow style="height: 100%">
        <VCol
          cols="12"
          md="6"
          lg="8"
        >
          <div
            ref="canvasContainer"
            class="canvas-container"
          >
            <canvas ref="canvas" />
            <div
              ref="canvasOverlay"
              class="canvas-container__overlay"
            >
              <div
                v-if="showGrid"
                class="canvas-container__overlay__grid"
                :style="{
                  '--width': width,
                  '--height': height
                }"
              />
              <VProgressCircular
                v-if="loading"
                style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"
                indeterminate
                size="64"
                color="primary"
              />
            </div>
          </div>
        </VCol>
        <VCol>
          <VFileUpload
            v-model="file"
            class="mb-4"
            accept="image/*"
            :multiple="false"
            density="compact"
          />

          <VLabel>
            Size
          </VLabel>
          <div class="d-flex">
            <VNumberInput
              v-model="width"
              class="mr-2"
              label="Width"
              :min="1"
              control-variant="stacked"
              hide-details
            />

            <VNumberInput
              v-model="height"
              label="Height"
              :min="1"
              control-variant="stacked"
              hide-details
            />
          </div>

          <VSwitch
            v-model="showGrid"
            label="Show Grid"
          />

          <VSelect
            v-model="fit"
            label="Image Fit"
            :items="[
              { title: 'Contain', value: 'contain' },
              { title: 'Cover', value: 'cover' },
              { title: 'Stretch', value: 'stretch' }
            ]"
          />

          <VColorInput
            v-if="fit === 'contain'"
            v-model="bgColor"
            label="Background Color"
            pip-variant="flat"
            color-pip
            hide-actions
            show-swatches
            :swatches="[
              baseColors.map((c) => ({
                r: c.color[0],
                g: c.color[1],
                b: c.color[2]
              })),
              baseColors.map((c) => ({
                r: c.color[0] * 0.86,
                g: c.color[1] * 0.86,
                b: c.color[2] * 0.86
              })),
              baseColors.map((c) => ({
                r: c.color[0] * 0.71,
                g: c.color[1] * 0.71,
                b: c.color[2] * 0.71
              })),
              baseColors.map((c) => ({
                r: c.color[0] * 0.53,
                g: c.color[1] * 0.53,
                b: c.color[2] * 0.53
              })),
            ]"
          />

          <VSelect
            v-model="dither"
            label="Dithering"
            :items="[
              { title: 'None', value: 'none' },
              { title: 'Floyd-Steinberg', value: 'floydSteinberg' },
              { title: 'Atkinson', value: 'atkinson' },
              { title: 'Bayer 2x2', value: 'bayer2x2' },
              { title: 'Bayer 4x4', value: 'bayer4x4' },
              { title: 'Bayer 8x8', value: 'bayer8x8' }
            ]"
          />

          <VLabel>
            Contrast
          </VLabel>
          <VSlider
            v-model="contrast"
            min="0"
            max="2"
            step="0.01"
            thumb-label
            hide-details
          />

          <VLabel>
            Brightness
          </VLabel>
          <VSlider
            v-model="brightness"
            min="0"
            max="2"
            step="0.01"
            thumb-label
            hide-details
          />

          <VLabel>
            Saturation
          </VLabel>
          <VSlider
            v-model="saturation"
            min="0"
            max="2"
            step="0.01"
            thumb-label
            hide-details
          />

          <VBtn
            color="primary"
            @click="contrast = 1; brightness = 1; saturation = 1"
          >
            Reset Color Adjustments
          </VBtn>
        </VCol>
      </VRow>
    </VCardText>

    <VCardActions>
      <VSpacer />
      <VBtn
        :loading="submitting || loading"
        color="primary"
        @click="submit"
      >
        Add Painting
      </VBtn>
    </VCardActions>
  </VCard>
</template>

<style scoped lang="scss">
.canvas-container {
  position: relative;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 25rem;

  canvas {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    image-rendering: pixelated;
    display: block;
  }

  &__overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;

    &__grid {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent calc(100% - 2px),
        cyan calc(100% - 2px),
        cyan 100%
      ), repeating-linear-gradient(
        90deg,
        transparent,
        transparent calc(100% - 2px),
        cyan calc(100% - 2px),
        cyan 100%
      );
      background-position: 0 -2px;
      background-size: calc((100% + 2px) / var(--width)) calc((100% + 2px) / var(--height));
    }
  }
}

</style>
