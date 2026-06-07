<template>
  <button class="green-btn" :disabled="disabled"><slot /></button>
</template>

<script setup>
const props = defineProps({
  disabled: {
    type: Boolean,
    required: false,
    default: false,
  },
})
</script>

<style lang="css" scoped>
.green-btn {
  display: inline-block;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background-color: #42b883;
  color: #f1f1f1;
  font-size: 14px;
  cursor: pointer;
  transition:
    background-color 0.3s,
    transform 0.1s;
  outline: none;
}

.green-btn:hover {
  background-color: #3aa876;
}

.green-btn:active {
  background-color: #359268;
  transform: scale(0.97);
}

.green-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  pointer-events: none;
}
</style>
