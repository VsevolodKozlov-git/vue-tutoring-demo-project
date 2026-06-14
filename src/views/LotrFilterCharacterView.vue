<template>
  <form>
    <div>
      <div>Gender</div>
      <input type="text" v-model="formValues.gender" />
    </div>

    <div>
      <div>Race</div>
      <input type="text" v-model="formValues.race" />
    </div>
  </form>

  <MButton @click="getCharacters">Получить персонажей</MButton>

  <template v-if="characters">
    <div v-for="character in characters" :key="character._id">
      <h3>{{ character.name }}</h3>
      <div>Death: {{ character.death ? character.death : 'Unknown' }}</div>
    </div>
  </template>
</template>

<script setup>
import MButton from '@/components/MButton.vue'
import axios from 'axios'
import { ref } from 'vue'

const formValues = ref({
  gender: null,
  race: null,
})

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
}
</script>

<style lang="css" scoped></style>
