<template>
  <div class="center-horizontal">
    <div class="card">
      <MHeader level="3"><slot name="header"></slot></MHeader>
      <slot name="content"></slot>
    </div>
  </div>
</template>

<script setup>
import MHeader from './MHeader.vue'
</script>

<style lang="css" scoped>
.center-horizontal {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.card {
  max-width: 85%;
  min-width: 800px;
  border: none;
  border-radius: 24px;
  background-color: #1c1f1f;
  padding: 12px 24px;
}
</style>
