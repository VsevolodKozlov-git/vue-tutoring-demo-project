<template>

  <UHeader>
    <template #title>
      <ULink to="/">МикроПроекты</ULink>
    </template>
    
    <UNavigationMenu :items="menuItems"/>

    <template #right>
      <UButton color="neutral" variant="ghost" target="_blank" to="https://github.com/VsevolodKozlov-git/vue-tutoring-demo-project">Github</UButton>
    </template>
  </UHeader>

</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router'

const route = useRoute()

const menuItems = computed(() => [
  {label: 'Hangman', to: '/hangman', active: route.path.startsWith('/hangman')},
  {label: 'BlackJack', to: '/blackjack', active: route.path.startsWith('/blackjack')},
])
</script>

<style lang="css" scoped>
nav {
  padding: 10px 30px;
  background-color: #1c1f1f;
}
.flex-nav {
  display: flex;
  justify-content: space-between;
}

.divider {
  width: 2px;
  background-color: #ccc;
  margin: 0 10px;
}

.flex-links {
  display: flex;
}

.games {
  font-weight: 800;
  font-size: 28px;
}
</style>
