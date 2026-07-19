<script setup>
import { RouterView } from 'vue-router'
import MNavBar from '@/components/MNavBar.vue'
</script>

<template>
  <UApp>
    <MNavBar />
    <UMain>
      <RouterView />
    </UMain>
  </UApp>
</template>

<style scoped></style>
