<script setup>
import MButton from '@/components/MButton.vue'
import MHeader from '@/components/MHeader.vue'
</script>

<template>
  <main>
    <MHeader level="1">Основная страница</MHeader>
    <MButton :disabled="true">Какой-то текст</MButton>
    <MButton></MButton>
  </main>
</template>

<style lang="css" scoped></style>
