<script setup>
import { RouterView } from 'vue-router'
import MNavBar from '@/components/MNavBar.vue'
</script>

<template>
  <UApp>
    <MNavBar />
    <RouterView />
  </UApp>
</template>

<style scoped></style>
