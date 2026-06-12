<template>
  <MButton @click="getFact">Получить случайный факт</MButton>
  <div v-if="!fact">Нажмите на кнопку</div>
  <div v-else>{{ fact }}</div>
</template>

<script setup>
import MButton from '@/components/MButton.vue'
import axios from 'axios'
import { ref } from 'vue'

const fact = ref(null)

const getFact = async () => {
  const response = await axios.get('https://meowfacts.herokuapp.com/')
  console.log(response.status)
  console.log(response.statusText)
  fact.value = response.data.data[0]
}
</script>

<style lang="css" scoped></style>
