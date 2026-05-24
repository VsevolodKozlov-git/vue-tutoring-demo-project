<template>
  <div class="center">
    <component :is="headerTag" class="header">
      <slot />
    </component>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  level: {
    type: String,
    required: true,
    validator: (value) => value >= 1 && value <= 6,
  },
})

const headerTag = computed(() => `h${props.level}`)
</script>

<style lang="css" scoped>
.center {
  display: flex;
  justify-content: center;
}
</style>
