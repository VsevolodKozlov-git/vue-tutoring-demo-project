<template>
  <MHeader level="1">Текстовый поиск</MHeader>
  <form @submit.prevent="processSend">
    <div>
      <div>Запрос:</div>
      <input required type="text" name="query" v-model="query" />
    </div>
    <div>
      <div>Алгоритм:</div>
      <select required name="algorithm" v-model="algorithm">
        <option default value="tf-idf">TF-IDF</option>
        <option value="bag-of-words">Bag of words</option>
      </select>
    </div>
    <input type="submit" />
  </form>
  <div>Порядок сортировки:</div>
  <select name="order" v-model="order">
    <option value="distance">По расстоянию</option>
    <option value="title">По названию</option>
  </select>
  <div v-if="!isSended">Для поиска введите запрос и нажмите "Отправить"</div>
  <table v-else>
    <thead>
      <tr>
        <th>Название</th>
        <th>Расстояние</th>
      </tr>
    </thead>
    <tr v-for="result in queryResultDisplay" :key="result.id">
      <td>{{ result.title }}</td>
      <td>{{ result.distance }}</td>
    </tr>
  </table>
</template>

<script setup>
import MHeader from '@/components/MHeader.vue'
import { computed, ref } from 'vue'
const query = ref(null)
const algorithm = ref(null)
const queryResult = ref(null)
const order = ref(null)

const queryResultDisplay = computed(() => {
  if (queryResult.value === null) {
    return null
  }

  let sortKey
  if (order.value === 'distance') {
    sortKey = (result) => result.distance
  } else if (order.value === 'title') {
    sortKey = (result) => result.title
  }

  if (sortKey) {
    return queryResult.value.toSorted(sortKey)
  }

  return queryResult.value
})

const dummyResult = [
  { id: 1, title: 'Евгений Онегин', distance: 0.2 },
  { id: 0, title: 'Медный всадник', distance: 0.1 },
]

const isSended = ref(false)

const processSend = () => {
  queryResult.value = dummyResult
  isSended.value = true
}
</script>

<style lang="css" scoped></style>
