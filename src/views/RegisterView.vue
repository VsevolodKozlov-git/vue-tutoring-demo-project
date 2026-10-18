<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-3xl font-bold">Регистрация</h1>

    <UForm :state="form" :validate="validateForm" @submit="onSubmit" class="space-y-4">
      <UFormField name="username" label="Логин">
        <UInput v-model="form.username" placeholder="Введите логин" />
      </UFormField>
      <UFormField name="password" label="Пароль">
        <UInput v-model="form.password" type="password" placeholder="Введите пароль" />
      </UFormField>
      <UFormField name="first_name" label="Имя">
        <UInput v-model="form.first_name" placeholder="Введите имя" />
      </UFormField>
      <UFormField name="second_name" label="Фамилия">
        <UInput v-model="form.second_name" placeholder="Введите фамилию" />
      </UFormField>
      <UButton type="submit" block>Зарегистрироваться</UButton>
    </UForm>

    <p>
      Уже есть аккаунт?
      <ULink to="/login" class="text-primary">Войдите</ULink>
    </p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { axiosLocalInstance, getApiErrorMessage } from '@/utils/api/axiosLocal'
import { isAuthorized, saveToken } from '@/utils/auth'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const router = useRouter()
const toast = useToast()

const form = ref({ username: '', password: '', first_name: '', second_name: '' })

const validateForm = () => {
  const errors = []
  const requiredFields = ['username', 'password', 'first_name', 'second_name']
  for (const name of requiredFields) {
    if (!form.value[name]) {
      errors.push({ name, message: 'Поле обязательно' })
    }
  }
  return errors
}

const onSubmit = async () => {
  try {
    await axiosLocalInstance.post('/register', {
      username: form.value.username,
      password: form.value.password,
      first_name: form.value.first_name,
      second_name: form.value.second_name,
    })

    const { data } = await axiosLocalInstance.post('/login', {
      username: form.value.username,
      password: form.value.password,
    })

    saveToken(data.access_token)
    toast.add({
      color: 'success',
      title: 'Регистрация успешна',
      description: 'Вы автоматически вошли в систему',
    })
    router.push('/')
  } catch (error) {
    toast.add({
      color: 'error',
      title: 'Ошибка регистрации',
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
