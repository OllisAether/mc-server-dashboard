<script setup lang="ts">

</script>

<template>
  <VApp>
    <VToolbar>
      <VToolbarTitle>
        <VAvatar
          class="mr-2"
          rounded="sm"
        >
          <VImg src="/server-icon.png" />
        </VAvatar>
        All hail memes SMP
      </VToolbarTitle>
    </VToolbar>
    <VMain>
      <RouterView>
        <template #default="{ Component }">
          <Suspense>
            <component :is="Component" />
          </Suspense>
        </template>
      </RouterView>
    </VMain>
  </VApp>
</template>
