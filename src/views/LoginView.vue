<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-3xl font-bold">Вход</h1>

    <UForm :state="form" :validate="validateForm" @submit="onSubmit" class="space-y-4">
      <UFormField name="username" label="Логин">
        <UInput v-model="form.username" placeholder="Введите логин" />
      </UFormField>
      <UFormField name="password" label="Пароль">
        <UInput v-model="form.password" type="password" placeholder="Введите пароль" />
      </UFormField>
      <UButton type="submit" block>Войти</UButton>
    </UForm>

    <p>
      Нет аккаунта?
      <ULink to="/register" class="text-primary">Зарегистрируйтесь</ULink>
    </p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { axiosLocalInstance, getApiErrorMessage } from '@/utils/api/axiosLocal'
import { isAuthorized, saveToken } from '@/utils/auth'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const form = ref({ username: '', password: '' })

const validateForm = () => {
  const errors = []
  if (!form.value.username) {
    errors.push({ name: 'username', message: 'Поле обязательно' })
  }
  if (!form.value.password) {
    errors.push({ name: 'password', message: 'Поле обязательно' })
  }
  return errors
}

const onSubmit = async () => {
  try {
    const { data } = await axiosLocalInstance.post('/login', {
      username: form.value.username,
      password: form.value.password,
    })

    saveToken(data.access_token)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (error) {
    toast.add({
      color: 'error',
      title: 'Ошибка входа',
      description: getApiErrorMessage(error),
    })
  }
}

onMounted(() => {
  if (isAuthorized()) {
    router.replace('/')
  }
})
</script>

<style lang="css" scoped></style>
