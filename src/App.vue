<script setup>
import { RouterView } from 'vue-router'

import MNavBar from '@/components/MNavBar.vue'
import { setUnauthorizedMessageCallback } from '@/utils/api/axiosLocal'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const toast = useToast()

setUnauthorizedMessageCallback(() => {
  toast.add({
    color: 'warning',
    title: 'Требуется авторизация',
    description: 'Страница доступна только авторизованным',
  })
})
</script>

<template>
  <UApp>
    <MNavBar />
    <UMain class="p-5">
      <RouterView />
    </UMain>
  </UApp>
</template>

<style scoped></style>
