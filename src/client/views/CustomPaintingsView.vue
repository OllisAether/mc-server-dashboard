<script lang="ts" setup>
import { ref } from 'vue'
import { Painting } from '../../shared/paintings'
import AddPaintingCard from '../components/AddPaintingCard.vue'

const data = ref<Painting[]>([])

async function fetchPaintings(id?: number) {
  data.value = await fetch('/api/paintings').then((res) => res.json())
  if (id) {
    openId.value = id
  }
}
fetchPaintings()

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

const openId = ref<number | null>(null)
</script>

<template>
  <VContainer>
    <VBtn
      class="mb-4"
      @click="fetchPaintings"
    >
      Refresh
    </VBtn>

    <div class="grid">
      <template
        v-for="painting in data"
        :key="painting.id"
      >
        <VCard v-ripple>
          <img
            class="d-block"
            :src="painting.previewUrl"
            :alt="`Preview of painting ${painting.id}`"
          >

          <VDialog
            activator="parent"
            max-width="500"
            :model-value="openId === painting.id"
            @update:model-value="(val) => {
              if (val) {
                openId = painting.id
              } else {
                openId = null
              }
            }"
          >
            <template #default="{ isActive }">
              <VCard>
                <img
                  class="d-block"
                  :src="painting.previewUrl"
                  :alt="`Preview of painting ${painting.id}`"
                >

                <VCardText class="pb-0">
                  Size: {{ painting.width }} x {{ painting.height }} (W x H)
                  <br>
                  <br>
                  <VCode>
                    /trigger getPainting set {{ painting.width * painting.height }}{{ painting.id }}{{ ('' + painting.id).length }}
                  </VCode>
                </VCardText>

                <VCardActions>
                  <VBtn @click="copyToClipboard(`/trigger getPainting set ${painting.width * painting.height}${painting.id}${('' + painting.id).length}`)">
                    Copy Command
                  </VBtn>
                  <VBtn
                    color="primary"
                    @click="isActive.value = false"
                  >
                    Close
                  </VBtn>
                </VCardActions>
              </VCard>
            </template>
          </VDialog>
        </VCard>
      </template>
      <VCard
        v-ripple
        color="transparent"
        class="add-painting d-flex align-center justify-center flex-column"
      >
        <VIcon
          size="4rem"
          class="mb-4"
        >
          mdi-plus
        </VIcon>
        <span style="font-size: 2rem;">
          Add Painting
        </span>

        <VDialog
          activator="parent"
          height="100%"
          persistent
          scrollable
        >
          <template #default="{ isActive }">
            <AddPaintingCard
              @close="isActive.value = false;"
              @submit="(id) => { fetchPaintings(id); }"
            />
          </template>
        </VDialog>
      </VCard>
    </div>
  </VContainer>
</template>

<style lang="scss" scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  gap: 16px;

  .v-card {
    height: 20rem;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.add-painting {
  border: .2rem dashed #fff2;
}
</style>
