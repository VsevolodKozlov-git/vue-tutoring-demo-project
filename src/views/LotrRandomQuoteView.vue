<template>
  <MButton @click="getQuote">Получить случайную цитату</MButton>
  <template v-if="quote">
    <div>{{ quote.movieName }}</div>
    <div>{{ quote.characterName }}</div>
    <div>{{ quote.dialog }}</div>
  </template>
</template>

<script setup>
import { axiosInstance } from '@/utils/api/axiosBase'
import MButton from '@/components/MButton.vue'
import axios from 'axios'
import { ref } from 'vue'

const quote = ref(null)

const getQuote = async () => {
  const quoteContent = {}
  const quoteRequest = await axiosInstance.get('/quotes/random')

  const quoteData = quoteRequest.data

  quoteContent.dialog = quoteData.dialog
  const characterId = quoteData.character
  const characterRequest = await axios.get(`https://the-one-api.dev/v2/character/${characterId}`, {
    headers: {
      Authorization: 'Bearer tpZuyiSiaMbJtq2x0K8w',
    },
  })

  quoteContent.characterName = characterRequest.data.docs[0].name

  const movieId = quoteData.movie
  const movieRequest = await axios.get(`https://the-one-api.dev/v2/movie/${movieId}`, {
    headers: {
      Authorization: 'Bearer tpZuyiSiaMbJtq2x0K8w',
    },
  })

  quoteContent.movieName = movieRequest.data.docs[0].name

  quote.value = quoteContent
}
</script>

<style lang="css" scoped></style>
