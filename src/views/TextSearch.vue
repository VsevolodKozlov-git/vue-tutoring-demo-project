<template>
  <MHeader level="1">Текстовый поиск</MHeader>
  <div>
    <div>Поисковой запрос:</div>
    <input type="text" name="searchQuery" v-model="searchQuery" />
  </div>

  <button @click="sendQuery">Отправить</button>

  <div v-if="queryResult">
    <div v-for="result in queryResult" :key="result.id">
      <div>{{ result.distance }} {{ result.title }}</div>
    </div>
  </div>
  <div v-else>Введите запрос, чтобы получить результат</div>
</template>

<script setup>
import MHeader from '@/components/MHeader.vue'
import { ref } from 'vue'

const searchQuery = ref(null)
const queryResult = ref(null)

const sendQuery = () => {
  queryResult.value = [
    {
      title: 'Евгений онегин',
      distance: 0.1,
      id: 0,
    },
    {
      title: 'Медный всадник',
      distance: 0.2,
      id: 1,
    },
    {
      title: 'Руслан и Людмила',
      distance: 0.3,
      id: 2,
    },
  ]
}
</script>

<style scoped></style>
