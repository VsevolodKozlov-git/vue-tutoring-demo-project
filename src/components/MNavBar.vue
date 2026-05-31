<template>
  <nav class="flex-nav">
    <RouterLink to="/">
      <h2 class="games">Игры</h2>
    </RouterLink>

    <div class="flex-links">
      <RouterLink to="/hangman" class="center-vertical"><h3>Hangman</h3></RouterLink>
      <div class="divider"></div>
      <RouterLink to="/blackjack" class="center-vertical"><h3>BlackJack</h3></RouterLink>
      <div class="divider"></div>
      <RouterLink to="/search" class="center-vertical"><h3>Текстовый поиск</h3></RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink } from 'vue-router'
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
