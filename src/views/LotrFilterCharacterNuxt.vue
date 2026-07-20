<template>
  <UForm :validate="validateForm" :state="formValues" @submit="getCharacters" class="space-y-4">
    <UFormField label="Раса" name="race">
      <USelect v-model="formValues.race" :items="raceItems" class="min-w-30"></USelect>
    </UFormField>

    <UFormField label="Пол" name="gender">
      <USelect v-model="formValues.gender" :items="genderItems" class="min-w-30"></USelect>
    </UFormField>

    <UButton type="submit">Найти персонажей</UButton>
  </UForm>
  <UTable :data="characters" :columns="tableColumns"> </UTable>
</template>

<script setup>
import axios from 'axios'
import { h, ref } from 'vue'
import UBadge from '@nuxt/ui/components/Badge.vue'

const toast = useToast()

const formValues = ref({ race: null, gender: null })
const raceItems = [
  { label: 'Орк', value: 'Orcs' },
  { label: 'Эльф', value: 'Elf' },
  { label: 'Хоббит', value: 'Hobbit' },
  { label: 'Человек', value: 'Human' },
]

const genderItems = [
  { label: 'Мужчина', value: 'Male' },
  { label: 'Женщина', value: 'Female' },
]

const tableColumns = [
  {
    accessorKey: 'name',
    header: 'Имя',
  },
  {
    accessorKey: 'death',
    header: 'Умер?',
    cell: ({ row }) => {
      const death = row.getValue('death')
      const props = {}
      let text
      if (death === null) {
        props.color = 'error'
        text = 'No data'
      } else {
        props.color = 'success'
        text = death
      }

      return h(UBadge, props, text)
    },
  },
]

const validateForm = () => {
  const errors = []
  if (!formValues.value.race) {
    errors.push({ name: 'race', message: 'Поле обязательно' })
  }

  if (!formValues.value.gender) {
    errors.push({ name: 'gender', message: 'Поле обязательно' })
  }

  return errors
}

const characters = ref(null)

const getCharacters = async () => {
  const params = {}

  for (const [key, value] of Object.entries(formValues.value)) {
    if (value) {
      params[key] = value
    }
  }

  const charactersRequest = await axios.get(`https://the-one-api.dev/v2/character`, {
    headers: {
      Authorization: 'Bearer tpZuyiSiaMbJtq2x0K8w',
    },
    params,
  })
  characters.value = charactersRequest.data.docs
  toast.add({ title: 'Успех', description: 'Данные успешно получены', color: 'success' })
}
</script>

<style scoped></style>
