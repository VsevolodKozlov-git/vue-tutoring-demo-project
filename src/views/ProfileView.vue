<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-3xl font-bold">Профиль</h1>

    <div v-if="loading">Загрузка профиля…</div>

    <UForm
      v-else-if="profile"
      :state="form"
      :validate="validateForm"
      @submit="onSubmit"
      class="space-y-4"
    >
      <UFormField name="username" label="Логин">
        <UInput :model-value="profile.username" disabled />
      </UFormField>
      <UFormField name="first_name" label="Имя">
        <UInput v-model="form.first_name" placeholder="Введите имя" />
      </UFormField>
      <UFormField name="second_name" label="Фамилия">
        <UInput v-model="form.second_name" placeholder="Введите фамилию" />
      </UFormField>
      <UButton type="submit" block>Сохранить</UButton>
    </UForm>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

import { axiosLocalInstance, getApiErrorMessage } from '@/utils/api/axiosLocal'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const toast = useToast()

const profile = ref(null)
const form = ref({ first_name: '', second_name: '' })
const loading = ref(false)

const loadProfile = async () => {
  loading.value = true
  try {
    const { data } = await axiosLocalInstance.get('/profile')
    profile.value = data
    form.value = { first_name: data.first_name, second_name: data.second_name }
  } catch {
    // 401 обрабатывается интерцептором: редирект на страницу логина
  } finally {
    loading.value = false
  }
}

const validateForm = () => {
  const errors = []
  if (!form.value.first_name) {
    errors.push({ name: 'first_name', message: 'Поле обязательно' })
  }
  if (!form.value.second_name) {
    errors.push({ name: 'second_name', message: 'Поле обязательно' })
  }
  return errors
}

const onSubmit = async () => {
  try {
    const { data } = await axiosLocalInstance.patch('/profile', {
      first_name: form.value.first_name,
      second_name: form.value.second_name,
    })
    profile.value = data
    form.value = { first_name: data.first_name, second_name: data.second_name }
    toast.add({
      color: 'success',
      title: 'Успех',
      description: 'Профиль обновлён',
    })
  } catch (error) {
    toast.add({
      color: 'error',
      title: 'Ошибка',
      description: getApiErrorMessage(error),
    })
  }
}

onMounted(loadProfile)
</script>

<style lang="css" scoped></style>
