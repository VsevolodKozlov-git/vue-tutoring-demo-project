<script setup>
import { RouterView } from 'vue-router'
import MNavBar from '@/components/MNavBar.vue'
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
