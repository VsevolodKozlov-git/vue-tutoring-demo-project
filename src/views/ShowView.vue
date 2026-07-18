<template>
  <button @click="sendPostRequest">Тык</button>
</template>

<script setup>
import axios from 'axios'
import { onMounted, ref } from 'vue'

const axiosConfig = axios.create({ baseURL: 'https://api.escuelajs.co/api/v1/' })

const productsResponse = ref(null)

onMounted(async () => {
  const response = await axiosConfig.get('/products')
  productsResponse.value = response.data
})

const sendPostRequest = async () => {
  try {
    await axiosConfig.post('/products', {
      title: 'strfjkjlfing',
      price: 100,
      description: 'string',
      categoryId: 1,
      images: [
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQETIyzJCtLZDWCFpWLQ4Cf5ck99uR9V9MCEAL2z5Hw&s',
      ],
    })
  } catch (error) {
    console.error(error)
  }
}
</script>

<style lang="scss" scoped></style>
