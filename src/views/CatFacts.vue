<template>
  <MButton @click="getFact">Получить факт</MButton>
  <div>
    {{ catFact }}
  </div>
</template>

<script setup>
import MButton from '@/components/MButton.vue'
import axios from 'axios'
import { ref } from 'vue'

const catFact = ref(null)

const getFact = async () => {
  try {
    const response = await axios.get('https://meowfacts.herokuapp.com/')
    if (response.status !== 200) {
      console.error('Запрос вернул статус !=200,')
      return
    }
    catFact.value = response.data.data[0]
  } catch (error) {
    console.error(error)
  }
}
</script>

<style lang="css" scoped></style>
