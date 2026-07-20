<template>
  <UForm :state="formItems" :validate="validateForm" @submit="sendPostRequest" class="space-y-2">
    <UFormField name="title" label="Название товара">
      <UInput v-model="formItems.title" />
    </UFormField>
    <UButton type="submit">Создать товар</UButton>
  </UForm>
</template>

<script setup>
import axios from 'axios'
import { ref } from 'vue'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
const toast = useToast()

const axiosConfig = axios.create({ baseURL: 'https://api.escuelajs.co/api/v1/' })

const formItems = ref({ title: null })

const validateForm = () => {
  const errors = []
  if (!formItems.value.title) {
    errors.push({ name: 'title', message: 'Поле обязательно' })
  }

  return errors
}

const sendPostRequest = async () => {
  try {
    await axiosConfig.post('/products', {
      title: formItems.value.title,
      price: 100,
      description: 'string',
      categoryId: 1,
      images: [
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQETIyzJCtLZDWCFpWLQ4Cf5ck99uR9V9MCEAL2z5Hw&s',
      ],
    })
    toast.add({
      color: 'success',
      title: 'Успех',
      description: 'Запрос успешно выполнен',
    })
  } catch (error) {
    console.error(error)
    toast.add({
      color: 'error',
      title: 'Ошибка',
      description: 'Возникла ошибка при выполнении запроса',
    })
  }
}
</script>

<style lang="scss" scoped></style>
